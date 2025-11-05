import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth"
import { reviewActivitySubmission, DatabaseError, ResourceNotFoundError, awardPointsWithBudget, issueReward, logActivityEvent } from "@/lib/db/queries"
import { prisma } from "@/lib/db"
import { fetchUserChallengeContext, canApproveSubmission } from "@/lib/auth/challenge-permissions"

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
    // Include workspace filter to help RLS verify access
    const existingSubmission = await prisma.activitySubmission.findFirst({
      where: {
        id,
        Activity: {
          Challenge: {
            workspaceId: workspace.id
          }
        }
      },
      include: {
        Activity: {
          include: {
            Challenge: true,
            ActivityTemplate: true
          }
        }
      }
    })

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check if submission can be reviewed by admin
    // Allow PENDING (direct admin review) or MANAGER_APPROVED (final approval after manager review)
    if (existingSubmission.status !== 'PENDING' && existingSubmission.status !== 'MANAGER_APPROVED') {
      return NextResponse.json({ error: 'Submission has already been reviewed' }, { status: 400 })
    }

    // Check permission to approve using multi-role system
    const permissionContext = await fetchUserChallengeContext(
      user.dbUser.id,
      existingSubmission.Activity.challengeId,
      workspace.id
    )

    // Prevent self-approval
    if (!canApproveSubmission(permissionContext.permissions, existingSubmission.userId, user.dbUser.id)) {
      return NextResponse.json(
        { error: 'You cannot approve your own submission' },
        { status: 403 }
      )
    }

    // Detect admin override: admin rejects a manager-approved submission
    const isAdminOverride = existingSubmission.status === 'MANAGER_APPROVED' && status === 'REJECTED'

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
      } else if (existingSubmission.Activity.Challenge.rewardType) {
        // Use challenge reward configuration - normalize to lowercase
        const challengeRewardType = existingSubmission.Activity.Challenge.rewardType as string
        rewardType = challengeRewardType.toLowerCase() as 'points' | 'sku' | 'monetary'
        const config = existingSubmission.Activity.Challenge.rewardConfig as any
        if (config) {
          rewardAmount = config.pointsAmount || config.amount || null
          rewardCurrency = config.currency || null
          rewardSkuId = config.skuId || null
        }
      }

      // Create reward issuance if we have a reward type
      // NOTE: issueReward automatically handles points awards via awardPointsWithBudget
      if (rewardType) {
        await issueReward({
          workspaceId: workspace.id,
          userId: submission.userId,
          challengeId: existingSubmission.Activity.challengeId,
          submissionId: submission.id,
          type: rewardType,
          amount: rewardAmount ?? undefined,
          currency: rewardCurrency ?? undefined,
          skuId: rewardSkuId ?? undefined,
          provider: rewardProvider ?? undefined
        })
      }
    }

    // Log review event
    // Include admin override flag in metadata when admin rejects manager-approved submission
    await logActivityEvent({
      workspaceId: workspace.id,
      challengeId: existingSubmission.Activity.challengeId,
      userId: submission.userId,
      actorUserId: user.dbUser.id,
      type: status === 'APPROVED' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
      metadata: {
        submissionId: submission.id,
        pointsAwarded: pointsAwarded || reward?.amount || 0,
        activityId: submission.activityId,
        activityName: existingSubmission.Activity?.ActivityTemplate?.name,
        reviewNotes: reviewNotes || undefined,
        previousStatus: existingSubmission.status,
        adminOverride: isAdminOverride || undefined
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