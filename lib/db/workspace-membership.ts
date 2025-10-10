/**
 * WorkspaceMembership Access Helpers
 * 
 * Typed database access functions for multi-workspace membership management.
 * Provides clean abstraction over Prisma queries with proper error handling.
 */

import { prisma } from './index'
import { type Role, type WorkspaceMembership, type WorkspaceMembershipWithDetails } from '@/lib/types'

/**
 * Get a specific membership for a user in a workspace
 */
export async function getMembership(
  userId: string, 
  workspaceId: string
): Promise<WorkspaceMembership | null> {
  try {
    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      }
    })

    return membership
  } catch (error) {
    console.error('Error fetching workspace membership:', error)
    return null
  }
}

/**
 * Get all memberships for a user across all workspaces
 */
export async function listMemberships(userId: string): Promise<WorkspaceMembershipWithDetails[]> {
  try {
    const memberships = await prisma.workspaceMembership.findMany({
      where: {
        userId
      },
      include: {
        user: true,
        workspace: {
          include: {
            _count: {
              select: {
                memberships: true,
                challenges: true
              }
            }
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' }, // Primary workspace first
        { joinedAt: 'asc' }    // Then by join date
      ]
    })

    return memberships as WorkspaceMembershipWithDetails[]
  } catch (error) {
    console.error('Error listing user memberships:', error)
    return []
  }
}

/**
 * Get all memberships for a workspace
 */
export async function listWorkspaceMemberships(workspaceId: string): Promise<WorkspaceMembershipWithDetails[]> {
  try {
    const memberships = await prisma.workspaceMembership.findMany({
      where: {
        workspaceId
      },
      include: {
        user: true,
        workspace: {
          include: {
            _count: {
              select: {
                memberships: true,
                challenges: true
              }
            }
          }
        }
      },
      orderBy: [
        { role: 'asc' },      // Admins first
        { joinedAt: 'asc' }   // Then by join date
      ]
    })

    return memberships as WorkspaceMembershipWithDetails[]
  } catch (error) {
    console.error('Error listing workspace memberships:', error)
    return []
  }
}

/**
 * Check if a user is an admin in a specific workspace
 */
export async function isWorkspaceAdmin(
  userId: string, 
  workspaceId: string
): Promise<boolean> {
  try {
    const membership = await getMembership(userId, workspaceId)
    return membership?.role === 'ADMIN'
  } catch (error) {
    console.error('Error checking workspace admin status:', error)
    return false
  }
}

/**
 * Check if a user has any access to a workspace (admin or participant)
 */
export async function hasWorkspaceAccess(
  userId: string, 
  workspaceId: string
): Promise<boolean> {
  try {
    const membership = await getMembership(userId, workspaceId)
    return membership !== null
  } catch (error) {
    console.error('Error checking workspace access:', error)
    return false
  }
}

/**
 * Check if a user is the owner of a workspace (primary admin)
 */
export async function isWorkspaceOwner(
  userId: string, 
  workspaceId: string
): Promise<boolean> {
  try {
    const membership = await getMembership(userId, workspaceId)
    return membership?.role === 'ADMIN' && membership?.isPrimary === true
  } catch (error) {
    console.error('Error checking workspace ownership:', error)
    return false
  }
}

/**
 * Get user's primary workspace membership
 */
export async function getPrimaryMembership(userId: string): Promise<WorkspaceMembershipWithDetails | null> {
  try {
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        userId,
        isPrimary: true
      },
      include: {
        user: true,
        workspace: {
          include: {
            _count: {
              select: {
                memberships: true,
                challenges: true
              }
            }
          }
        }
      }
    })

    return membership as WorkspaceMembershipWithDetails | null
  } catch (error) {
    console.error('Error fetching primary membership:', error)
    return null
  }
}

/**
 * Create a new workspace membership
 */
export async function createMembership(
  userId: string,
  workspaceId: string,
  role: Role,
  isPrimary: boolean = false
): Promise<WorkspaceMembership | null> {
  try {
    // If this is being marked as primary, unset other primary memberships
    if (isPrimary) {
      await prisma.workspaceMembership.updateMany({
        where: {
          userId,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      })
    }

    const membership = await prisma.workspaceMembership.create({
      data: {
        userId,
        workspaceId,
        role,
        isPrimary
      }
    })

    return membership
  } catch (error) {
    console.error('Error creating workspace membership:', error)
    return null
  }
}

/**
 * Update a workspace membership role
 */
export async function updateMembershipRole(
  userId: string,
  workspaceId: string,
  role: Role
): Promise<WorkspaceMembership | null> {
  try {
    const membership = await prisma.workspaceMembership.update({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      },
      data: {
        role
      }
    })

    return membership
  } catch (error) {
    console.error('Error updating membership role:', error)
    return null
  }
}

/**
 * Set a membership as primary (and unset others)
 */
export async function setPrimaryMembership(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    // First, unset all primary memberships for this user
    await prisma.workspaceMembership.updateMany({
      where: {
        userId,
        isPrimary: true
      },
      data: {
        isPrimary: false
      }
    })

    // Then set the specified membership as primary
    await prisma.workspaceMembership.update({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      },
      data: {
        isPrimary: true
      }
    })

    return true
  } catch (error) {
    console.error('Error setting primary membership:', error)
    return false
  }
}

/**
 * Remove a workspace membership
 */
export async function removeMembership(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    await prisma.workspaceMembership.delete({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      }
    })

    return true
  } catch (error) {
    console.error('Error removing workspace membership:', error)
    return false
  }
}

/**
 * Get workspace membership count for analytics
 */
export async function getWorkspaceMembershipCount(workspaceId: string): Promise<{
  total: number
  admins: number
  participants: number
}> {
  try {
    const [total, admins] = await Promise.all([
      prisma.workspaceMembership.count({
        where: { workspaceId }
      }),
      prisma.workspaceMembership.count({
        where: { 
          workspaceId,
          role: 'ADMIN'
        }
      })
    ])

    return {
      total,
      admins,
      participants: total - admins
    }
  } catch (error) {
    console.error('Error getting workspace membership count:', error)
    return { total: 0, admins: 0, participants: 0 }
  }
}

/**
 * Ensure a workspace has a primary admin (owner)
 * Used for migration from ownerId system to membership-based ownership
 */
export async function ensureWorkspaceOwnership(workspaceId: string): Promise<boolean> {
  try {
    // Check if workspace already has a primary admin (owner)
    const existingOwner = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        role: 'ADMIN',
        isPrimary: true
      }
    })

    if (existingOwner) {
      return true // Already has an owner
    }

    // Find the first admin to make primary
    const firstAdmin = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        role: 'ADMIN'
      },
      orderBy: {
        joinedAt: 'asc' // Oldest admin first
      }
    })

    if (firstAdmin) {
      // Make the first admin the primary owner
      await setPrimaryMembership(firstAdmin.userId, workspaceId)
      console.log(`✓ Set primary ownership for workspace ${workspaceId} to user ${firstAdmin.userId}`)
      return true
    }

    console.warn(`⚠️ No admin found for workspace ${workspaceId}`)
    return false
  } catch (error) {
    console.error('Error ensuring workspace ownership:', error)
    return false
  }
}

/**
 * Transfer workspace ownership from one admin to another
 * Only the current primary admin can transfer ownership
 */
export async function transferWorkspaceOwnership(
  workspaceId: string,
  fromUserId: string,
  toUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify fromUser is current primary owner
    const currentOwner = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: fromUserId,
          workspaceId
        }
      }
    })

    if (!currentOwner || currentOwner.role !== 'ADMIN' || !currentOwner.isPrimary) {
      return { success: false, error: 'Only the workspace owner can transfer ownership' }
    }

    // Verify toUser exists and is an admin
    const newOwner = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: toUserId,
          workspaceId
        }
      }
    })

    if (!newOwner) {
      return { success: false, error: 'Target user is not a member of this workspace' }
    }

    if (newOwner.role !== 'ADMIN') {
      return { success: false, error: 'Target user must be an admin to receive ownership' }
    }

    // Perform atomic transfer
    await prisma.$transaction([
      // Remove primary from current owner
      prisma.workspaceMembership.update({
        where: {
          userId_workspaceId: {
            userId: fromUserId,
            workspaceId
          }
        },
        data: { isPrimary: false }
      }),
      // Set new owner as primary
      prisma.workspaceMembership.update({
        where: {
          userId_workspaceId: {
            userId: toUserId,
            workspaceId
          }
        },
        data: { isPrimary: true }
      })
    ])

    console.log(`✓ Transferred ownership of workspace ${workspaceId} from ${fromUserId} to ${toUserId}`)
    return { success: true }
  } catch (error) {
    console.error('Error transferring workspace ownership:', error)
    return { success: false, error: 'Failed to transfer ownership' }
  }
}