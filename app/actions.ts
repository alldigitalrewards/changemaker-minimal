'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getUserWorkspaceRole, getCurrentWorkspace } from '@/lib/workspace-context'
import { createEnrollment, updateEnrollmentStatus, deleteEnrollment } from '@/lib/db/queries'
import type { FormState } from '@/lib/types'

// =============================================================================
// CHALLENGE PARTICIPANT MANAGEMENT ACTIONS
// =============================================================================

/**
 * Add participant to challenge (admin only)
 */
export async function addParticipantToChallenge(
  workspaceSlug: string,
  challengeId: string,
  participantId: string
): Promise<FormState> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Verify admin access
    const role = await getUserWorkspaceRole(workspaceSlug)
    if (role !== 'ADMIN') {
      return { error: 'Unauthorized - Admin access required' }
    }

    const workspace = await getCurrentWorkspace(workspaceSlug)
    if (!workspace) {
      return { error: 'Workspace not found' }
    }

    // Create enrollment
    await createEnrollment(participantId, challengeId, workspace.id)
    
    revalidatePath(`/w/${workspaceSlug}/admin/challenges/${challengeId}`)
    revalidatePath(`/w/${workspaceSlug}/admin/participants`)
    
    return { success: 'Participant added to challenge successfully' }
  } catch (error) {
    console.error('Error adding participant to challenge:', error)
    return { error: error instanceof Error ? error.message : 'Failed to add participant' }
  }
}

/**
 * Update enrollment status (admin only)
 */
export async function updateParticipantStatus(
  workspaceSlug: string,
  enrollmentId: string,
  status: string
): Promise<FormState> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Verify admin access
    const role = await getUserWorkspaceRole(workspaceSlug)
    if (role !== 'ADMIN') {
      return { error: 'Unauthorized - Admin access required' }
    }

    const workspace = await getCurrentWorkspace(workspaceSlug)
    if (!workspace) {
      return { error: 'Workspace not found' }
    }

    // Update enrollment status
    await updateEnrollmentStatus(enrollmentId, status, workspace.id)
    
    revalidatePath(`/w/${workspaceSlug}/admin/challenges`)
    revalidatePath(`/w/${workspaceSlug}/admin/participants`)
    
    return { success: 'Participant status updated successfully' }
  } catch (error) {
    console.error('Error updating participant status:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update status' }
  }
}

/**
 * Remove participant from challenge (admin only)
 */
export async function removeParticipantFromChallenge(
  workspaceSlug: string,
  enrollmentId: string
): Promise<FormState> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Verify admin access
    const role = await getUserWorkspaceRole(workspaceSlug)
    if (role !== 'ADMIN') {
      return { error: 'Unauthorized - Admin access required' }
    }

    const workspace = await getCurrentWorkspace(workspaceSlug)
    if (!workspace) {
      return { error: 'Workspace not found' }
    }

    // Delete enrollment
    await deleteEnrollment(enrollmentId, workspace.id)
    
    revalidatePath(`/w/${workspaceSlug}/admin/challenges`)
    revalidatePath(`/w/${workspaceSlug}/admin/participants`)
    
    return { success: 'Participant removed from challenge successfully' }
  } catch (error) {
    console.error('Error removing participant from challenge:', error)
    return { error: error instanceof Error ? error.message : 'Failed to remove participant' }
  }
}

/**
 * Bulk add participants to challenge (admin only)
 */
export async function bulkAddParticipantsToChallenge(
  workspaceSlug: string,
  challengeId: string,
  participantIds: string[]
): Promise<FormState> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Verify admin access
    const role = await getUserWorkspaceRole(workspaceSlug)
    if (role !== 'ADMIN') {
      return { error: 'Unauthorized - Admin access required' }
    }

    const workspace = await getCurrentWorkspace(workspaceSlug)
    if (!workspace) {
      return { error: 'Workspace not found' }
    }

    // Add all participants
    const results = await Promise.allSettled(
      participantIds.map(participantId => 
        createEnrollment(participantId, challengeId, workspace.id)
      )
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    revalidatePath(`/w/${workspaceSlug}/admin/challenges/${challengeId}`)
    revalidatePath(`/w/${workspaceSlug}/admin/participants`)
    
    if (failed === 0) {
      return { success: `Successfully added ${successful} participants` }
    } else {
      return { success: `Added ${successful} participants (${failed} failed)` }
    }
  } catch (error) {
    console.error('Error bulk adding participants:', error)
    return { error: error instanceof Error ? error.message : 'Failed to add participants' }
  }
}
