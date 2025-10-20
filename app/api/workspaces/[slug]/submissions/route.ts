import { NextRequest, NextResponse } from "next/server"
import { withErrorHandling, requireWorkspaceAccess } from "@/lib/auth/api-auth"
import { createActivitySubmission, DatabaseError, ResourceNotFoundError, logActivityEvent } from "@/lib/db/queries"
import { prisma } from "@/lib/prisma"

export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await context.params
  const { workspace, user } = await requireWorkspaceAccess(slug)

  const { activityId, enrollmentId, textContent, fileUrls, linkUrl } = await request.json()

  if (!activityId || !enrollmentId) {
    return NextResponse.json({ error: "activityId and enrollmentId are required" }, { status: 400 })
  }

  try {
    // Verify enrollment belongs to user and workspace
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        userId: user.dbUser.id,
        Challenge: { workspaceId: workspace.id }
      },
      include: { Challenge: true }
    })

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found or access denied" }, { status: 404 })
    }

    // Verify activity belongs to the challenge
    const activity = await prisma.activity.findFirst({
      where: {
        id: activityId,
        challengeId: enrollment.challengeId
      }
    })

    if (!activity) {
      return NextResponse.json({ error: "Activity not found in this challenge" }, { status: 404 })
    }

    // Create submission
    const submission = await createActivitySubmission({
      activityId,
      userId: user.dbUser.id,
      enrollmentId,
      textContent,
      fileUrls,
      linkUrl
    })

    // Log submission event
    await logActivityEvent({
      workspaceId: workspace.id,
      challengeId: enrollment.challengeId,
      enrollmentId: enrollment.id,
      userId: user.dbUser.id,
      actorUserId: user.dbUser.id,
      type: 'ACTIVITY_SUBMITTED',
      metadata: {
        submissionId: submission.id,
        activityId
      }
    })

    return NextResponse.json({ submission }, { status: 200 })
  } catch (error) {
    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
})
