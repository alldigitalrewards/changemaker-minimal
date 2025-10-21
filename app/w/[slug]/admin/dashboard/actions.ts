'use server'

import { revalidatePath } from 'next/cache'
import { reviewActivitySubmission, awardPointsWithBudget, getUserBySupabaseId, verifyWorkspaceAdmin, logActivityEvent } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { issueReward } from '@/lib/db/reward-issuance'

export async function quickApproveSubmission(
  submissionId: string,
  workspaceId: string,
  slug: string,
  pointsAwarded: number
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return { success: false, error: 'User not found' }
    }

    const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspaceId)
    if (!isAdmin) {
      return { success: false, error: 'Admin privileges required' }
    }

    // Review submission
    const reviewed = await reviewActivitySubmission(
      submissionId,
      {
        status: 'APPROVED',
        pointsAwarded,
        reviewedBy: dbUser.id,
        reviewNotes: 'Quick approved from dashboard'
      },
      workspaceId
    )

    // Determine reward configuration
    let rewardType: 'points' | 'sku' | 'monetary' | null = null
    let rewardAmount: number | null = null
    let rewardCurrency: string | null = null
    let rewardSkuId: string | null = null

    if ((pointsAwarded ?? 0) > 0) {
      rewardType = 'points'
      rewardAmount = pointsAwarded
    } else if (reviewed.Activity.Challenge.rewardType) {
      const challengeRewardType = reviewed.Activity.Challenge.rewardType as string
      rewardType = challengeRewardType.toLowerCase() as 'points' | 'sku' | 'monetary'
      const config = reviewed.Activity.Challenge.rewardConfig as any
      if (config) {
        rewardAmount = config.pointsAmount || config.amount || null
        rewardCurrency = config.currency || null
        rewardSkuId = config.skuId || null
      }
    }

    // Award points
    if (rewardType === 'points' && (rewardAmount ?? 0) > 0) {
      await awardPointsWithBudget({
        workspaceId,
        challengeId: reviewed.Activity.challengeId,
        toUserId: reviewed.userId,
        amount: rewardAmount!,
        actorUserId: dbUser.id,
        submissionId: reviewed.id
      })
    }

    if (rewardType) {
      await issueReward({
        workspaceId,
        userId: reviewed.userId,
        challengeId: reviewed.Activity.challengeId,
        submissionId: reviewed.id,
        type: rewardType,
        amount: rewardAmount,
        currency: rewardCurrency,
        skuId: rewardSkuId
      })
    }

    await logActivityEvent({
      workspaceId,
      challengeId: reviewed.Activity.challengeId,
      userId: reviewed.userId,
      actorUserId: dbUser.id,
      type: 'SUBMISSION_APPROVED',
      metadata: {
        submissionId: reviewed.id,
        pointsAwarded: rewardAmount || 0,
        activityId: reviewed.activityId,
        activityName: reviewed.Activity.ActivityTemplate?.name,
        reviewNotes: 'Quick approved from dashboard'
      }
    })

    revalidatePath(`/w/${slug}/admin/dashboard`)
    revalidatePath(`/w/${slug}/admin/challenges/${reviewed.Activity.challengeId}/submissions`)
    return { success: true, submission: reviewed }
  } catch (error) {
    console.error('Error approving submission:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve submission'
    }
  }
}

export async function quickRejectSubmission(
  submissionId: string,
  workspaceId: string,
  slug: string,
  reviewNotes?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return { success: false, error: 'User not found' }
    }

    const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspaceId)
    if (!isAdmin) {
      return { success: false, error: 'Admin privileges required' }
    }

    const reviewed = await reviewActivitySubmission(
      submissionId,
      {
        status: 'REJECTED',
        reviewedBy: dbUser.id,
        reviewNotes: reviewNotes || 'Rejected from dashboard'
      },
      workspaceId
    )

    await logActivityEvent({
      workspaceId,
      challengeId: reviewed.Activity.challengeId,
      userId: reviewed.userId,
      actorUserId: dbUser.id,
      type: 'SUBMISSION_REJECTED',
      metadata: {
        submissionId: reviewed.id,
        activityId: reviewed.activityId,
        activityName: reviewed.Activity.ActivityTemplate?.name,
        reviewNotes: reviewNotes || 'Rejected from dashboard'
      }
    })

    revalidatePath(`/w/${slug}/admin/dashboard`)
    revalidatePath(`/w/${slug}/admin/challenges/${reviewed.Activity.challengeId}/submissions`)
    return { success: true, submission: reviewed }
  } catch (error) {
    console.error('Error rejecting submission:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject submission'
    }
  }
}
