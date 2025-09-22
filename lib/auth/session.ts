import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { type User } from '@prisma/client'
import { getUserWorkspaceRole } from '@/lib/db/workspace-compatibility'

export async function getSession() {
  try {
    const supabase = await createClient()
    // Use getUser for secure authentication
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
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
    
    if (error || !authUser) return null

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