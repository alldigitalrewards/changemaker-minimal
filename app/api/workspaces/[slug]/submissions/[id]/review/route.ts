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
    // Get submission with challenge info for reward determination
    const existingSubmission = await prisma.activitySubmission.findUnique({
      where: { id },
      include: {
        activity: {
          include: {
            challenge: true
          }
        }
      }
    })

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check if already reviewed
    if (existingSubmission.status !== 'PENDING') {
      return NextResponse.json({ error: 'Submission has already been reviewed' }, { status: 400 })
    }

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

    // If approved, issue reward
    if (status === 'APPROVED') {
      // Determine reward configuration - priority: explicit reward > pointsAwarded > challenge config
      let rewardType: 'points' | 'sku' | 'monetary' | null = null
      let rewardAmount: number | null = null
      let rewardCurrency: string | null = null
      let rewardSkuId: string | null = null
      let rewardProvider: string | null = null

      if (reward && reward.type) {
        // Explicit reward provided in request - normalize to lowercase
        rewardType = reward.type.toLowerCase() as 'points' | 'sku' | 'monetary'
        rewardAmount = reward.amount ?? null
        rewardCurrency = reward.currency ?? null
        rewardSkuId = reward.skuId ?? null
        rewardProvider = reward.provider ?? null
      } else if ((pointsAwarded ?? 0) > 0) {
        // Points awarded provided (legacy)
        rewardType = 'points'
        rewardAmount = pointsAwarded
      } else if (existingSubmission.activity.challenge.rewardType) {
        // Use challenge reward configuration - normalize to lowercase
        const challengeRewardType = existingSubmission.activity.challenge.rewardType as string
        rewardType = challengeRewardType.toLowerCase() as 'points' | 'sku' | 'monetary'
        const config = existingSubmission.activity.challenge.rewardConfig as any
        if (config) {
          rewardAmount = config.pointsAmount || config.amount || null
          rewardCurrency = config.currency || null
          rewardSkuId = config.skuId || null
        }
      }

      // Create reward issuance if we have a reward type
      if (rewardType) {
        if (rewardType === 'points' && (rewardAmount ?? 0) > 0) {
          // Award points to budget/balance
          await awardPointsWithBudget({
            workspaceId: workspace.id,
            challengeId: submission.activity.challengeId,
            toUserId: submission.userId,
            amount: rewardAmount!,
            actorUserId: user.dbUser.id,
            submissionId: submission.id
          })
        }

        // Create reward issuance record (PENDING status)
        await issueReward({
          workspaceId: workspace.id,
          userId: submission.userId,
          challengeId: submission.activity.challengeId,
          submissionId: submission.id,
          type: rewardType,
          amount: rewardAmount,
          currency: rewardCurrency,
          skuId: rewardSkuId,
          provider: rewardProvider
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