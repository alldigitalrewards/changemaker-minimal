/**
 * Workspace Context Helpers
 *
 * Server-side helpers for workspace authentication and context management.
 * Uses WorkspaceMembership system for multi-tenant access control.
 */

import { getMembership, listMemberships } from '@/lib/db/workspace-membership'
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

    // Get user's membership in this workspace
    const membership = await getMembership(userId, workspace.id)
    const userRole = membership?.role || null
    const canAccess = membership !== null
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
    const memberships = await listMemberships(userId)
    return memberships
      .map(m => m.workspace)
      .filter((w): w is Workspace => w !== null && w !== undefined)
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
    const workspace = await getWorkspaceBySlug(slug)
    if (!workspace) return false

    const membership = await getMembership(userId, workspace.id)
    return membership?.role === 'ADMIN'
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
    const workspace = await getWorkspaceBySlug(slug)
    if (!workspace) return false

    const membership = await getMembership(userId, workspace.id)
    return membership !== null
  } catch (error) {
    console.error('Error checking workspace access:', error)
    return false
  }
}