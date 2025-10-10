/**
 * Workspace Invitation Helpers
 *
 * Functions for generating, managing, and redeeming workspace invitations.
 * Supports both code-based and email-based invitation flows.
 */

import { prisma } from './index'
import { type Role } from '@/lib/types'
import { createMembership } from './workspace-membership'

/**
 * Generate a random 8-character alphanumeric invite code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Create a workspace invitation
 */
export async function createWorkspaceInvite(params: {
  workspaceId: string
  createdBy: string
  role?: Role
  targetEmail?: string | null
  expiresInDays?: number
  maxUses?: number
  challengeId?: string | null
}): Promise<{ code: string; id: string } | null> {
  const {
    workspaceId,
    createdBy,
    role = 'PARTICIPANT',
    targetEmail = null,
    expiresInDays = 30,
    maxUses = 1,
    challengeId = null
  } = params

  try {
    // Generate unique code
    let code = generateInviteCode()
    let attempts = 0
    const maxAttempts = 10

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const existing = await prisma.inviteCode.findUnique({
        where: { code }
      })
      if (!existing) break
      code = generateInviteCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      console.error('Failed to generate unique invite code after max attempts')
      return null
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        workspaceId,
        createdBy,
        role,
        targetEmail,
        expiresAt,
        maxUses,
        challengeId
      }
    })

    return { code: invite.code, id: invite.id }
  } catch (error) {
    console.error('Error creating workspace invite:', error)
    return null
  }
}

/**
 * Validate and redeem an invite code
 */
export async function redeemInviteCode(
  code: string,
  userId: string,
  userEmail: string
): Promise<{
  success: boolean
  error?: string
  workspaceId?: string
  challengeId?: string
}> {
  try {
    // Find the invite code
    const invite = await prisma.inviteCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        workspace: true,
        redemptions: true
      }
    })

    if (!invite) {
      return { success: false, error: 'Invalid invite code' }
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      return { success: false, error: 'This invite code has expired' }
    }

    // Check max uses
    if (invite.usedCount >= invite.maxUses) {
      return { success: false, error: 'This invite code has reached its maximum uses' }
    }

    // Check email restriction
    if (invite.targetEmail && invite.targetEmail.toLowerCase() !== userEmail.toLowerCase()) {
      return {
        success: false,
        error: 'This invite code is restricted to a specific email address'
      }
    }

    // Check if user already redeemed this invite
    const existingRedemption = invite.redemptions.find(r => r.userId === userId)
    if (existingRedemption) {
      return { success: false, error: 'You have already redeemed this invite code' }
    }

    // Check if user is already a member
    const existingMembership = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: invite.workspaceId
        }
      }
    })

    if (existingMembership) {
      return { success: false, error: 'You are already a member of this workspace' }
    }

    // Create membership and redemption record in a transaction
    await prisma.$transaction(async (tx) => {
      // Create workspace membership
      await tx.workspaceMembership.create({
        data: {
          userId,
          workspaceId: invite.workspaceId,
          role: invite.role,
          isPrimary: false
        }
      })

      // Record redemption
      await tx.inviteRedemption.create({
        data: {
          inviteId: invite.id,
          userId
        }
      })

      // Increment used count
      await tx.inviteCode.update({
        where: { id: invite.id },
        data: {
          usedCount: { increment: 1 }
        }
      })

      // If invite includes a challenge, auto-enroll
      if (invite.challengeId) {
        await tx.enrollment.create({
          data: {
            userId,
            challengeId: invite.challengeId,
            status: 'ENROLLED'
          }
        })
      }
    })

    return {
      success: true,
      workspaceId: invite.workspaceId,
      challengeId: invite.challengeId || undefined
    }
  } catch (error) {
    console.error('Error redeeming invite code:', error)
    return { success: false, error: 'Failed to redeem invite code' }
  }
}

/**
 * List all pending invites for a user (by email)
 */
export async function listPendingInvites(userEmail: string): Promise<Array<{
  id: string
  code: string
  workspaceName: string
  workspaceSlug: string
  role: Role
  expiresAt: Date
  creatorEmail: string
}>> {
  try {
    const invites = await prisma.inviteCode.findMany({
      where: {
        targetEmail: userEmail.toLowerCase(),
        expiresAt: { gt: new Date() },
        usedCount: { lt: prisma.inviteCode.fields.maxUses }
      },
      include: {
        workspace: { select: { name: true, slug: true } },
        creator: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return invites.map(invite => ({
      id: invite.id,
      code: invite.code,
      workspaceName: invite.workspace.name,
      workspaceSlug: invite.workspace.slug,
      role: invite.role,
      expiresAt: invite.expiresAt,
      creatorEmail: invite.creator.email
    }))
  } catch (error) {
    console.error('Error listing pending invites:', error)
    return []
  }
}

/**
 * Get pending invite count for a user
 */
export async function getPendingInviteCount(userEmail: string): Promise<number> {
  try {
    const count = await prisma.inviteCode.count({
      where: {
        targetEmail: userEmail.toLowerCase(),
        expiresAt: { gt: new Date() },
        usedCount: { lt: prisma.inviteCode.fields.maxUses }
      }
    })
    return count
  } catch (error) {
    console.error('Error getting pending invite count:', error)
    return 0
  }
}

/**
 * List all invites created by a workspace admin
 */
export async function listWorkspaceInvites(workspaceId: string): Promise<Array<{
  id: string
  code: string
  role: Role
  targetEmail: string | null
  expiresAt: Date
  maxUses: number
  usedCount: number
  createdAt: Date
  challengeTitle?: string
}>> {
  try {
    const invites = await prisma.inviteCode.findMany({
      where: { workspaceId },
      include: {
        challenge: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return invites.map(invite => ({
      id: invite.id,
      code: invite.code,
      role: invite.role,
      targetEmail: invite.targetEmail,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      usedCount: invite.usedCount,
      createdAt: invite.createdAt,
      challengeTitle: invite.challenge?.title
    }))
  } catch (error) {
    console.error('Error listing workspace invites:', error)
    return []
  }
}

/**
 * Revoke an invite code (soft delete by setting expiration to past)
 */
export async function revokeInviteCode(inviteId: string): Promise<boolean> {
  try {
    await prisma.inviteCode.update({
      where: { id: inviteId },
      data: { expiresAt: new Date(0) } // Set to epoch
    })
    return true
  } catch (error) {
    console.error('Error revoking invite code:', error)
    return false
  }
}
