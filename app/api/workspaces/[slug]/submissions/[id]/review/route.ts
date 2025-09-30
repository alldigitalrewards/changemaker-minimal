import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth"
import { reviewActivitySubmission, DatabaseError, ResourceNotFoundError, awardPointsWithBudget } from "@/lib/db/queries"
import { issueReward } from '@/lib/db/reward-issuance'
import { prisma } from "@/lib/db"
import { logActivityEvent } from "@/lib/db/queries"

export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await context.params
  const { status, reviewNotes, pointsAwarded, reward } = await request.json()

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

    // If approved, issue reward per request
    if (status === 'APPROVED') {
      if (reward && reward.type) {
        if (reward.type === 'points' && (reward.amount ?? 0) > 0) {
          await awardPointsWithBudget({
            workspaceId: workspace.id,
            challengeId: submission.activity.challengeId,
            toUserId: submission.userId,
            amount: reward.amount,
            actorUserId: user.dbUser.id,
            submissionId: submission.id
          })
          await issueReward({
            workspaceId: workspace.id,
            userId: submission.userId,
            challengeId: submission.activity.challengeId,
            submissionId: submission.id,
            type: 'points',
            amount: reward.amount
          })
        } else if (reward.type === 'sku' || reward.type === 'monetary') {
          await issueReward({
            workspaceId: workspace.id,
            userId: submission.userId,
            challengeId: submission.activity.challengeId,
            submissionId: submission.id,
            type: reward.type,
            amount: reward.amount ?? null,
            currency: reward.currency ?? null,
            skuId: reward.skuId ?? null,
            provider: reward.provider ?? null
          })
        }
      } else if ((pointsAwarded ?? 0) > 0) {
        // Back-compat: points-only
        await awardPointsWithBudget({
          workspaceId: workspace.id,
          challengeId: submission.activity.challengeId,
          toUserId: submission.userId,
          amount: pointsAwarded,
          actorUserId: user.dbUser.id,
          submissionId: submission.id
        })
        await issueReward({
          workspaceId: workspace.id,
          userId: submission.userId,
          challengeId: submission.activity.challengeId,
          submissionId: submission.id,
          type: 'points',
          amount: pointsAwarded
        })
      }
    }

    // Log review event
    await logActivityEvent({
      workspaceId: workspace.id,
      challengeId: submission.activity.challengeId,
      userId: submission.userId,
      actorUserId: user.dbUser.id,
      type: status === 'APPROVED' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
      metadata: {
        submissionId: submission.id,
        pointsAwarded: pointsAwarded || reward?.amount || 0,
        activityId: submission.activityId,
        activityName: submission.activity?.template?.name,
        reviewNotes: reviewNotes || undefined
      }
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