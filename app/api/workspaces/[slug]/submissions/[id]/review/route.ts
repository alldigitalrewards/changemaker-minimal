import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth"
import { reviewActivitySubmission, DatabaseError, ResourceNotFoundError } from "@/lib/db/queries"
import { prisma } from "@/lib/db"
import { logActivityEvent } from "@/lib/db/queries"

export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await context.params
  const { status, reviewNotes, pointsAwarded } = await request.json()

  // Require admin access
  const { workspace, user } = await requireWorkspaceAdmin(slug)

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
  }

  try {
    // Review the submission
    const submission = await reviewActivitySubmission(
      id,
      {
        status,
        reviewNotes,
        pointsAwarded,
        reviewedBy: user.dbUser.id
      },
      workspace.id
    )

    // If approved, update points balance
    if (status === 'APPROVED' && pointsAwarded > 0) {
      await prisma.pointsBalance.upsert({
        where: {
          userId_workspaceId: {
            userId: submission.userId,
            workspaceId: workspace.id
          }
        },
        update: {
          totalPoints: { increment: pointsAwarded },
          availablePoints: { increment: pointsAwarded }
        },
        create: {
          userId: submission.userId,
          workspaceId: workspace.id,
          totalPoints: pointsAwarded,
          availablePoints: pointsAwarded
        }
      })
    }

    // Log review event
    await logActivityEvent({
      workspaceId: workspace.id,
      challengeId: submission.activity.challengeId,
      userId: submission.userId,
      actorUserId: user.dbUser.id,
      type: status === 'APPROVED' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
      metadata: { submissionId: submission.id, pointsAwarded: pointsAwarded || 0, activityId: submission.activityId }
    })

    return NextResponse.json({ submission })
  } catch (error) {
    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    
    throw error // Let withErrorHandling handle other errors
  }
})