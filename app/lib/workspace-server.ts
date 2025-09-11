/**
 * Workspace Server Helpers
 * 
 * Server-side workspace utilities specifically for the app router.
 * Provides cached workspace access with priority: headers > cookies > primary.
 */

import { headers, cookies } from 'next/headers'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceContext, getUserAccessibleWorkspaces } from '@/lib/auth/workspace-context'
import { getPrimaryMembership } from '@/lib/db/workspace-membership'
import { getUserBySupabaseId } from '@/lib/db/queries'
import { type Workspace, type Role } from '@/lib/types'

/**
 * Get current workspace with priority system (cached per request)
 */
export const getActiveWorkspace = cache(async (): Promise<{
  workspace: Workspace | null
  role: Role | null
  slug: string | null
}> => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { workspace: null, role: null, slug: null }
    }

    // Priority 1: Headers (set by middleware for /w/[slug] routes)
    const headersList = await headers()
    const headerSlug = headersList.get('x-workspace-slug')
    const headerRole = headersList.get('x-workspace-role') as Role | null

    if (headerSlug && headerRole) {
      const context = await getWorkspaceContext(headerSlug, user.id)
      if (context.canAccess) {
        return {
          workspace: context.workspace,
          role: context.userRole,
          slug: headerSlug
        }
      }
    }

    // Priority 2: Cookies (user's last selected workspace)
    const cookieStore = await cookies()
    const cookieSlug = cookieStore.get('lastWorkspaceId')?.value

    if (cookieSlug) {
      const context = await getWorkspaceContext(cookieSlug, user.id)
      if (context.canAccess) {
        return {
          workspace: context.workspace,
          role: context.userRole,
          slug: cookieSlug
        }
      }
    }

    // Priority 3: Primary workspace
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

      // Fallback to first accessible workspace
      const workspaces = await getUserAccessibleWorkspaces(dbUser.id)
      if (workspaces.length > 0) {
        const firstWorkspace = workspaces[0]
        const context = await getWorkspaceContext(firstWorkspace.slug, user.id)
        return {
          workspace: context.workspace,
          role: context.userRole,
          slug: firstWorkspace.slug
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
 * Get workspace role for current user (cached per request)
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

    // Check headers first (most efficient)
    const headersList = await headers()
    const headerSlug = headersList.get('x-workspace-slug')
    const headerRole = headersList.get('x-workspace-role') as Role | null

    if (headerSlug === workspaceSlug && headerRole) {
      return headerRole
    }

    // Fallback to database query
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const context = await getWorkspaceContext(workspaceSlug, user.id)
    return context.userRole

  } catch (error) {
    console.error('Error getting workspace role:', error)
    return null
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

/**
 * Get all user workspaces (cached per request)
 */
export const getUserWorkspacesServer = cache(async (): Promise<Workspace[]> => {
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
 * Get workspace context for server components
 */
export const getWorkspaceServerContext = cache(async (slug: string) => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    return await getWorkspaceContext(slug, user.id)

  } catch (error) {
    console.error('Error getting workspace server context:', error)
    return null
  }
})