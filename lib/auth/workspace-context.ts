/**
 * Workspace Context Helpers
 * 
 * Server-side helpers for workspace authentication and context management.
 * Integrates with WorkspaceMembership system while maintaining backward compatibility.
 */

import { getUserWorkspaceRole, getUserWorkspaces } from '@/lib/db/workspace-compatibility'
import { getWorkspaceBySlug } from '@/lib/db/queries'
import { type Workspace, type Role } from '@/lib/types'

export interface WorkspaceContext {
  workspace: Workspace | null
  userRole: Role | null
  canAccess: boolean
  isAdmin: boolean
}

/**
 * Get comprehensive workspace context for a user
 */
export async function getWorkspaceContext(
  slug: string, 
  userId: string
): Promise<WorkspaceContext> {
  try {
    // Get workspace by slug
    const workspace = await getWorkspaceBySlug(slug)
    if (!workspace) {
      return {
        workspace: null,
        userRole: null,
        canAccess: false,
        isAdmin: false
      }
    }

    // Get user's role in this workspace
    const userRole = await getUserWorkspaceRole(userId, slug)
    const canAccess = userRole !== null
    const isAdmin = userRole === 'ADMIN'

    return {
      workspace,
      userRole,
      canAccess,
      isAdmin
    }
  } catch (error) {
    console.error('Error getting workspace context:', error)
    return {
      workspace: null,
      userRole: null,
      canAccess: false,
      isAdmin: false
    }
  }
}

/**
 * Get all accessible workspaces for a user
 */
export async function getUserAccessibleWorkspaces(userId: string): Promise<Workspace[]> {
  try {
    return await getUserWorkspaces(userId)
  } catch (error) {
    console.error('Error getting user workspaces:', error)
    return []
  }
}

/**
 * Check if user has admin access to workspace
 */
export async function hasWorkspaceAdminAccess(
  userId: string, 
  slug: string
): Promise<boolean> {
  try {
    const role = await getUserWorkspaceRole(userId, slug)
    return role === 'ADMIN'
  } catch (error) {
    console.error('Error checking admin access:', error)
    return false
  }
}

/**
 * Check if user has any access to workspace
 */
export async function hasWorkspaceAccess(
  userId: string, 
  slug: string
): Promise<boolean> {
  try {
    const role = await getUserWorkspaceRole(userId, slug)
    return role !== null
  } catch (error) {
    console.error('Error checking workspace access:', error)
    return false
  }
}