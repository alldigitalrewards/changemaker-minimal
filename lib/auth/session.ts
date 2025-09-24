import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { type User } from '@prisma/client'
import { getUserWorkspaceRole } from '@/lib/db/workspace-compatibility'
import type { CanonicalWorkspaceAccess, UserSummary } from '@/lib/auth/types'

export async function getSession() {
  try {
    const supabase = await createClient()
    // Use getUser for secure authentication
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      // Suppress refresh token errors on initial page loads
      if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token_not_found')) {
        // This is expected when there's no active session
        return null
      }
      // Log other auth errors
      console.error('Auth error in getSession:', error)
      return null
    }

    if (!user) {
      return null
    }

    // Return user data in session-like format for compatibility
    return {
      user,
      access_token: '', // Not available from getUser
      refresh_token: '' // Not available from getUser
    }
  } catch (error) {
    console.error('Failed to get session:', error)
    return null
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (error) {
      // Suppress refresh token errors
      if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token_not_found')) {
        return null
      }
      console.error('Auth error in getCurrentUser:', error)
      return null
    }

    if (!authUser) return null

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id }
    })

    return user
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export async function requireWorkspaceAccess(workspaceSlug: string) {
  const user = await requireAuth()
  
  // Look up workspace by slug directly (do not rely on legacy user.workspaceId)
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug }
  })

  if (!workspace) {
    throw new Error('Workspace not found')
  }

  // Membership-aware access check using compatibility layer
  // Uses Supabase user id stored on the Prisma User record
  const supabaseUserId = user.supabaseUserId
  const role = supabaseUserId
    ? await getUserWorkspaceRole(supabaseUserId, workspaceSlug)
    : null

  if (!role) {
    throw new Error('Workspace access denied')
  }

  return { user, workspace }
}

/**
 * Canonical helper that returns a normalized shape for both API and UI consumers.
 * Keeps the legacy requireWorkspaceAccess intact while allowing gradual migration.
 */
export async function requireWorkspaceAccessCanonical(workspaceSlug: string): Promise<CanonicalWorkspaceAccess> {
  const { user, workspace } = await requireWorkspaceAccess(workspaceSlug)

  const minimalUser: UserSummary = {
    id: user.id,
    email: user.email
  }

  // Retrieve role for completeness
  const role = user.supabaseUserId
    ? await getUserWorkspaceRole(user.supabaseUserId, workspaceSlug)
    : null

  return { user: minimalUser, workspace, role: role ?? undefined }
}