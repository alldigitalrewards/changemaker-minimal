'use server'

import { revalidatePath } from 'next/cache'
import { reviewActivitySubmission, awardPointsWithBudget } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { getUserBySupabaseId } from '@/lib/db/queries'

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

    // Award points
    if (pointsAwarded > 0) {
      await awardPointsWithBudget({
        workspaceId,
        challengeId: reviewed.activity.challengeId,
        toUserId: reviewed.userId,
        amount: pointsAwarded,
        actorUserId: dbUser.id,
        submissionId: reviewed.id
      })
    }

    revalidatePath(`/w/${slug}/admin/dashboard`)
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

    const reviewed = await reviewActivitySubmission(
      submissionId,
      {
        status: 'REJECTED',
        reviewedBy: dbUser.id,
        reviewNotes: reviewNotes || 'Rejected from dashboard'
      },
      workspaceId
    )

    revalidatePath(`/w/${slug}/admin/dashboard`)
    return { success: true, submission: reviewed }
  } catch (error) {
    console.error('Error rejecting submission:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject submission'
    }
  }
}
