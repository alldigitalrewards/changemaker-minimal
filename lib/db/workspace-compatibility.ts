/**
 * Workspace Membership Compatibility Layer
 * 
 * Provides backward compatibility for code that relies on User.workspaceId
 * while gradually migrating to the new WorkspaceMembership model.
 * 
 * This allows existing code to continue working while new features
 * can use the more flexible membership system.
 */

import { getUserBySupabaseId, getWorkspaceBySlug } from './queries'
import { getMembership, listMemberships, isWorkspaceAdmin, getPrimaryMembership } from './workspace-membership'
import { type Role, type Workspace } from '@/lib/types'

/**
 * Get user's workspace role for a specific workspace slug (compatibility)
 * This function maintains the existing API while using the new membership system
 */
/**
 * Edge-compatible version for middleware that uses Supabase directly
 */
export async function getUserWorkspaceRoleEdge(
  supabase: any,
  supabaseUserId: string, 
  workspaceSlug: string
): Promise<Role | null> {
  try {
    // First try to get membership through the new system
    const { data: membership, error: membershipError } = await supabase
      .from('WorkspaceMembership')
      .select('role')
      .eq('userId', supabaseUserId)
      .eq('workspace.slug', workspaceSlug)
      .single()
    
    if (!membershipError && membership) {
      return membership.role as Role
    }

    // Fall back to checking the User table for legacy workspaceId
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('role, workspace:Workspace!inner(slug)')
      .eq('supabaseUserId', supabaseUserId)
      .eq('workspace.slug', workspaceSlug)
      .single()
    
    if (!userError && userData) {
      return userData.role as Role
    }

    return null
  } catch (error) {
    console.error('Error getting user workspace role (Edge):', error)
    return null
  }
}

export async function getUserWorkspaceRole(supabaseUserId: string, workspaceSlug: string): Promise<Role | null> {
  try {
    // Get user from database
    const dbUser = await getUserBySupabaseId(supabaseUserId)
    if (!dbUser) return null

    // Get workspace by slug
    const workspace = await getWorkspaceBySlug(workspaceSlug)
    if (!workspace) return null

    // First, try the new membership system
    const membership = await getMembership(dbUser.id, workspace.id)
    if (membership) {
      return membership.role
    }

    // Fall back to legacy User.workspaceId if membership doesn't exist
    if (dbUser.workspaceId === workspace.id) {
      return dbUser.role
    }

    return null
  } catch (error) {
    console.error('Error getting user workspace role:', error)
    return null
  }
}

/**
 * Get user's primary workspace (compatibility)
 * Returns the primary workspace if available, otherwise falls back to User.workspaceId
 */
export async function getUserPrimaryWorkspace(supabaseUserId: string): Promise<Workspace | null> {
  try {
    const dbUser = await getUserBySupabaseId(supabaseUserId)
    if (!dbUser) return null

    // First, try to get primary membership
    const primaryMembership = await getPrimaryMembership(dbUser.id)
    if (primaryMembership) {
      return primaryMembership.workspace
    }

    // Fall back to legacy workspace relationship
    if (dbUser.workspaceId && dbUser.workspace) {
      return dbUser.workspace
    }

    return null
  } catch (error) {
    console.error('Error getting user primary workspace:', error)
    return null
  }
}

/**
 * Check if user is admin in workspace (compatibility)
 */
export async function checkWorkspaceAdmin(supabaseUserId: string, workspaceSlug: string): Promise<boolean> {
  try {
    const role = await getUserWorkspaceRole(supabaseUserId, workspaceSlug)
    return role === 'ADMIN'
  } catch (error) {
    console.error('Error checking workspace admin:', error)
    return false
  }
}

/**
 * Get all workspaces for a user (new functionality with backward compatibility)
 * Returns workspaces from memberships plus legacy workspace if not in memberships
 */
export async function getUserWorkspaces(supabaseUserId: string): Promise<Workspace[]> {
  try {
    const dbUser = await getUserBySupabaseId(supabaseUserId)
    if (!dbUser) return []

    // Get all memberships
    const memberships = await listMemberships(dbUser.id)
    const workspaces = memberships.map(m => m.workspace)

    // Check if legacy workspace is included in memberships
    if (dbUser.workspaceId && dbUser.workspace) {
      const hasLegacyInMemberships = workspaces.some(w => w.id === dbUser.workspaceId)
      
      // If legacy workspace not in memberships, add it
      if (!hasLegacyInMemberships) {
        workspaces.push(dbUser.workspace)
      }
    }

    return workspaces
  } catch (error) {
    console.error('Error getting user workspaces:', error)
    return []
  }
}

/**
 * Migration helper: Sync legacy User.workspaceId to WorkspaceMembership
 * This can be called during authentication to gradually migrate users
 */
export async function syncLegacyMembership(userId: string): Promise<void> {
  try {
    const user = await getUserBySupabaseId(userId)
    if (!user || !user.workspaceId) return

    // Check if membership already exists
    const existingMembership = await getMembership(user.id, user.workspaceId)
    if (existingMembership) return

    // Create membership from legacy data
    const { createMembership } = await import('./workspace-membership')
    await createMembership(user.id, user.workspaceId, user.role, true)
  } catch (error) {
    console.error('Error syncing legacy membership:', error)
  }
}