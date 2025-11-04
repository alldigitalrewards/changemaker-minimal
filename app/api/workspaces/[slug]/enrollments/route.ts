import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth"
import {
  createEnrollment,
  getUserEnrollments,
  getAllWorkspaceEnrollments,
  getWorkspaceUsers,
  createActivitySubmission,
  DatabaseError,
  ValidationError,
  WorkspaceAccessError,
  ResourceNotFoundError
} from "@/lib/db/queries"
import { prisma } from "@/lib/db"
import { logActivityEvent } from "@/lib/db/queries"

export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await context.params
  const action = request.headers.get('X-Action')

  // Handle activity submissions
  if (action === 'ACTIVITY_SUBMISSION') {
    const { activityId, textContent, linkUrl, fileUrls } = await request.json()
    const { workspace, user } = await requireWorkspaceAccess(slug)

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }

    try {
      // Verify user is enrolled in the challenge that contains this activity
      const activity = await prisma.activity.findFirst({
        where: {
          id: activityId,
          Challenge: { workspaceId: workspace.id }
        },
        include: {
          ActivityTemplate: true,
          Challenge: true,
          ActivitySubmission: {
            where: { userId: user.dbUser.id },
            orderBy: { submittedAt: 'desc' }
          }
        }
      })

      if (!activity) {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      }

      // Check if user is enrolled in the challenge
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: user.dbUser.id,
          challengeId: activity.challengeId,
          status: 'ENROLLED'
        }
      })

      if (!enrollment) {
        return NextResponse.json({ error: 'You must be enrolled in this challenge to submit activities' }, { status: 403 })
      }

      // Check submission limits
      const existingSubmissions = activity.ActivitySubmission.length
      if (existingSubmissions >= activity.maxSubmissions) {
        return NextResponse.json({ error: 'Maximum submissions reached for this activity' }, { status: 400 })
      }

      // Check deadline
      if (activity.deadline && new Date() > new Date(activity.deadline)) {
        return NextResponse.json({ error: 'Submission deadline has passed' }, { status: 400 })
      }

      // Determine initial status based on template settings
      const initialStatus = activity.ActivityTemplate.requiresApproval ? 'PENDING' : 'APPROVED'
      
      // Create the submission
      const submission = await createActivitySubmission({
        activityId,
        userId: user.dbUser.id,
        enrollmentId: enrollment.id,
        textContent,
        fileUrls,
        linkUrl
      })

      // Log submission created
      await logActivityEvent({
        workspaceId: workspace.id,
        challengeId: activity.challengeId,
        userId: user.dbUser.id,
        actorUserId: user.dbUser.id,
        type: 'SUBMISSION_CREATED',
        metadata: { submissionId: submission.id, activityId }
      })

      // If auto-approved, award points immediately
      if (initialStatus === 'APPROVED') {
        await prisma.activitySubmission.update({
          where: { id: submission.id },
          data: {
            status: 'APPROVED',
            pointsAwarded: activity.pointsValue,
            reviewedAt: new Date()
          }
        })

        // Update or create points balance
        await prisma.pointsBalance.upsert({
          where: {
            userId_workspaceId: {
              userId: user.dbUser.id,
              workspaceId: workspace.id
            }
          },
          update: {
            totalPoints: { increment: activity.pointsValue },
            availablePoints: { increment: activity.pointsValue }
          },
          create: {
            id: crypto.randomUUID(),
            userId: user.dbUser.id,
            workspaceId: workspace.id,
            totalPoints: activity.pointsValue,
            availablePoints: activity.pointsValue
          }
        })
      }

      return NextResponse.json({ 
        submission: {
          ...submission,
          status: initialStatus,
          pointsAwarded: initialStatus === 'APPROVED' ? activity.pointsValue : null
        }
      })
    } catch (error) {
      console.error('Activity submission error:', error)
      if (error instanceof DatabaseError || error instanceof ResourceNotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      throw error
    }
  }

  // Handle regular enrollment
  const { challengeId, userId, status } = await request.json()

  // Require workspace access
  const { workspace, user } = await requireWorkspaceAccess(slug)

  // Determine enrollment status: use provided status or default to 'ENROLLED'
  const enrollmentStatus = status || 'ENROLLED'

  // Create enrollment using standardized query (includes validation)
  try {
    const enrollment = await createEnrollment(user.dbUser.id, challengeId, workspace.id, enrollmentStatus)

    // Log enrollment event
    await logActivityEvent({
      workspaceId: workspace.id,
      challengeId,
      enrollmentId: enrollment.id,
      userId: user.dbUser.id,
      actorUserId: user.dbUser.id,
      type: 'ENROLLED',
      metadata: { method: 'self_enroll' }
    })

    // Auto-sync participant to RewardSTACK if enabled
    // This runs async in the background to not block enrollment response
    if (workspace.rewardStackEnabled) {
      // Import dynamically to avoid circular dependencies
      import('@/lib/rewardstack/participant-sync')
        .then(({ syncParticipantToRewardStack }) => {
          syncParticipantToRewardStack(user.dbUser.id, workspace.id).catch(
            (error) => {
              console.error(
                `Failed to auto-sync participant ${user.dbUser.id} to RewardSTACK:`,
                error
              );
            }
          );
        })
        .catch((error) => {
          console.error('Failed to load participant sync module:', error);
        });
    }

    return NextResponse.json({ enrollment })
  } catch (error) {
    if (error instanceof ValidationError) {
      // Validation errors should return 400
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    throw error // Let withErrorHandling handle other errors
  }
})


export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await context.params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  // Get enrollments using standardized query
  let enrollments
  if (userId) {
    // Require basic workspace access for user-specific enrollments
    const { workspace, user } = await requireWorkspaceAccess(slug)
    enrollments = await getUserEnrollments(userId, workspace.id)
  } else {
    // Require admin access for all workspace enrollments
    const { workspace, user } = await requireWorkspaceAdmin(slug)
    enrollments = await getAllWorkspaceEnrollments(workspace.id)
  }

  return NextResponse.json(enrollments)
})

