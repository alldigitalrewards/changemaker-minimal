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
        User: true,
        Workspace: {
          include: {
            _count: {
              select: {
                WorkspaceMembership: true,
                Challenge: true
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

    // Map Prisma's PascalCase relations to interface's lowercase properties
    return memberships.map(m => ({
      ...m,
      user: m.User,
      workspace: m.Workspace
    }) as unknown as WorkspaceMembershipWithDetails)
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
        User: true,
        Workspace: {
          include: {
            _count: {
              select: {
                WorkspaceMembership: true,
                Challenge: true
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

    // Map Prisma's PascalCase relations to interface's lowercase properties
    return memberships.map(m => ({
      ...m,
      user: m.User,
      workspace: m.Workspace
    }) as unknown as WorkspaceMembershipWithDetails)
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
 * Check if a user is the owner of a workspace
 * Note: isOwner determines workspace ownership (who created/owns the workspace)
 * This is different from isPrimary (user's default workspace preference)
 */
export async function isWorkspaceOwner(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    const membership = await getMembership(userId, workspaceId)
    return membership?.role === 'ADMIN' && membership?.isOwner === true
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
        User: true,
        Workspace: {
          include: {
            _count: {
              select: {
                WorkspaceMembership: true,
                Challenge: true
              }
            }
          }
        }
      }
    })

    if (!membership) return null

    // Map Prisma's PascalCase relations to interface's lowercase properties
    return {
      ...membership,
      user: membership.User,
      workspace: membership.Workspace
    } as unknown as WorkspaceMembershipWithDetails
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
 * Ensure a workspace has an owner
 * Used for migration or initialization to ensure each workspace has exactly one owner
 */
export async function ensureWorkspaceOwnership(workspaceId: string): Promise<boolean> {
  try {
    // Check if workspace already has an owner
    const existingOwner = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        role: 'ADMIN',
        isOwner: true
      }
    })

    if (existingOwner) {
      return true // Already has an owner
    }

    // Find the first non-platform-super-admin to make owner
    const firstRegularAdmin = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        role: 'ADMIN'
      },
      include: {
        User: true
      },
      orderBy: {
        joinedAt: 'asc' // Oldest admin first
      }
    })

    if (firstRegularAdmin) {
      // Clear any existing isOwner flags (safety check)
      await prisma.workspaceMembership.updateMany({
        where: { workspaceId },
        data: { isOwner: false }
      })

      // Set this admin as owner
      await prisma.workspaceMembership.update({
        where: { id: firstRegularAdmin.id },
        data: { isOwner: true }
      })

      console.log(`✓ Set workspace owner for workspace ${workspaceId} to user ${firstRegularAdmin.userId}`)
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
 * Only the current workspace owner can transfer ownership
 */
export async function transferWorkspaceOwnership(
  workspaceId: string,
  fromUserId: string,
  toUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify fromUser is current workspace owner
    const currentOwner = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: fromUserId,
          workspaceId
        }
      }
    })

    if (!currentOwner || currentOwner.role !== 'ADMIN' || !currentOwner.isOwner) {
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
      // Remove owner flag from current owner
      prisma.workspaceMembership.update({
        where: {
          userId_workspaceId: {
            userId: fromUserId,
            workspaceId
          }
        },
        data: { isOwner: false }
      }),
      // Set new user as owner
      prisma.workspaceMembership.update({
        where: {
          userId_workspaceId: {
            userId: toUserId,
            workspaceId
          }
        },
        data: { isOwner: true }
      })
    ])

    console.log(`✓ Transferred ownership of workspace ${workspaceId} from ${fromUserId} to ${toUserId}`)
    return { success: true }
  } catch (error) {
    console.error('Error transferring workspace ownership:', error)
    return { success: false, error: 'Failed to transfer ownership' }
  }
}