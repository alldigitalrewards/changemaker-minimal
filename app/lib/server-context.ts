/**
 * Server Context Helpers
 * 
 * Server-side workspace context with request-level caching.
 * Reads from headers set by middleware and provides fallbacks.
 */

import { headers, cookies } from 'next/headers'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceContext, getUserAccessibleWorkspaces } from '@/lib/auth/workspace-context'
import { getPrimaryMembership } from '@/lib/db/workspace-membership'
import { getUserBySupabaseId } from '@/lib/db/queries'
import { type Workspace, type Role } from '@/lib/types'

/**
 * Get current workspace from headers or cookies (cached per request)
 */
export const getActiveWorkspace = cache(async (): Promise<{
  workspace: Workspace | null
  role: Role | null
  slug: string | null
}> => {
  try {
    // First try to get from headers (set by middleware)
    const headersList = await headers()
    const workspaceSlug = headersList.get('x-workspace-slug')
    const workspaceRole = headersList.get('x-workspace-role') as Role | null

    if (workspaceSlug && workspaceRole) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const context = await getWorkspaceContext(workspaceSlug, user.id)
        return {
          workspace: context.workspace,
          role: context.userRole,
          slug: workspaceSlug
        }
      }
    }

    // Fallback: Check cookies for last workspace preference
    const cookieStore = await cookies()
    const lastWorkspaceSlug = cookieStore.get('lastWorkspaceId')?.value

    if (lastWorkspaceSlug) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const context = await getWorkspaceContext(lastWorkspaceSlug, user.id)
        if (context.canAccess) {
          return {
            workspace: context.workspace,
            role: context.userRole,
            slug: lastWorkspaceSlug
          }
        }
      }
    }

    // Final fallback: Get user's primary workspace
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const dbUser = await getUserBySupabaseId(user.id)
      if (dbUser) {
        const primaryMembership = await getPrimaryMembership(dbUser.id)
        if (primaryMembership) {
          return {
            workspace: primaryMembership.workspace,
            role: primaryMembership.role,
            slug: primaryMembership.workspace.slug
          }
        }
      }
    }

    return { workspace: null, role: null, slug: null }
  } catch (error) {
    console.error('Error getting active workspace:', error)
    return { workspace: null, role: null, slug: null }
  }
})

/**
 * Get current user's workspace role (cached per request)
 */
export const getWorkspaceRole = cache(async (slug?: string): Promise<Role | null> => {
  try {
    // Use provided slug or get from active workspace
    let workspaceSlug = slug
    if (!workspaceSlug) {
      const active = await getActiveWorkspace()
      workspaceSlug = active.slug
    }

    if (!workspaceSlug) return null

    // Try headers first (from middleware)
    const headersList = await headers()
    const headerSlug = headersList.get('x-workspace-slug')
    const headerRole = headersList.get('x-workspace-role') as Role | null

    if (headerSlug === workspaceSlug && headerRole) {
      return headerRole
    }

    // Fallback to database query
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const context = await getWorkspaceContext(workspaceSlug, user.id)
      return context.userRole
    }

    return null
  } catch (error) {
    console.error('Error getting workspace role:', error)
    return null
  }
})

/**
 * Get all user workspaces (cached per request)
 */
export const getUserWorkspacesContext = cache(async (): Promise<Workspace[]> => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []

    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) return []

    return await getUserAccessibleWorkspaces(dbUser.id)
  } catch (error) {
    console.error('Error getting user workspaces:', error)
    return []
  }
})

/**
 * Check if current user is admin in workspace
 */
export const isWorkspaceAdmin = cache(async (slug?: string): Promise<boolean> => {
  const role = await getWorkspaceRole(slug)
  return role === 'ADMIN'
})

/**
 * Check if current user has access to workspace
 */
export const hasWorkspaceAccessServer = cache(async (slug?: string): Promise<boolean> => {
  const role = await getWorkspaceRole(slug)
  return role !== null
})