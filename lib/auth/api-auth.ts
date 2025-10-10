import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserBySupabaseId, getWorkspaceBySlug, verifyWorkspaceAdmin } from '@/lib/db/queries'
import { syncSupabaseUser } from '@/lib/auth/sync-user'
import { getUserWorkspaceRole } from '@/lib/db/workspace-compatibility'
import type { AuthenticatedUser, WorkspaceContext } from '@/lib/auth/types'
import type { User } from '@prisma/client'

/**
 * Standardized authentication helper for API routes
 * Returns authenticated user or throws standardized error response
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Auth error:', error)
    throw NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }

  if (!user) {
    throw NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) {
    // Attempt to auto-sync user into Prisma on first encounter
    try {
      await syncSupabaseUser(user as any)
      dbUser = await getUserBySupabaseId(user.id)
    } catch (_) {}
  }
  if (!dbUser) {
    throw NextResponse.json({ error: 'User not found in database' }, { status: 404 })
  }

  return { supabaseUser: user, dbUser }
}

/**
 * Check if a user has platform super admin permissions
 */
export function isPlatformSuperAdmin(user: User | AuthenticatedUser): boolean {
  const dbUser = 'dbUser' in user ? user.dbUser : user

  // PM superadmin access
  if (dbUser.email === 'krobinson@alldigitalrewards.com') {
    return true
  }

  return dbUser.permissions.includes('platform_super_admin')
}

/**
 * Check if a user can access a workspace based on tenant scoping
 * Platform super admins can access all tenants
 * Client admins can access all workspaces in their tenant
 * Participants can only access workspaces they're members of
 */
export function canAccessWorkspace(user: User, _workspace: { tenantId: string }, hasMembership: boolean): boolean {
  // Platform super admins see everything
  if (isPlatformSuperAdmin(user)) {
    return true
  }

  // For all other users, require explicit membership
  return hasMembership
}

/**
 * Requires authentication and workspace access
 * Returns workspace context with authenticated user
 */
export async function requireWorkspaceAccess(slug: string): Promise<WorkspaceContext> {
  const user = await requireAuth()

  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) {
    throw NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Membership-aware access check with legacy fallback
  const role = await getUserWorkspaceRole(user.supabaseUser.id, slug)
  const hasMembership = !!role

  // Tenant-aware access control
  if (!canAccessWorkspace(user.dbUser, workspace as any, hasMembership)) {
    throw NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
  }

  return { workspace, user, role: role || user.dbUser.role }
}

/**
 * Requires authentication, workspace access, and admin privileges
 * Returns workspace context with verified admin user
 */
export async function requireWorkspaceAdmin(slug: string): Promise<WorkspaceContext> {
  const context = await requireWorkspaceAccess(slug)

  // Prefer membership-derived role if available; verify with DB helper as defense in depth
  const roleIsAdmin = context.role === 'ADMIN'
  const dbSaysAdmin = await verifyWorkspaceAdmin(context.user.dbUser.id, context.workspace.id)
  if (!(roleIsAdmin || dbSaysAdmin)) {
    throw NextResponse.json({ 
      error: 'Admin privileges required for this operation' 
    }, { status: 403 })
  }

  return context
}

/**
 * Wrapper for API route handlers with standardized error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse<any>>
) {
  return async (...args: T): Promise<NextResponse<any>> => {
    try {
      return await handler(...args)
    } catch (error) {
      // If error is already a NextResponse, return it
      if (error instanceof NextResponse) {
        return error
      }
      
      // Map known DB errors to clearer codes/status
      const anyErr = error as any
      const code = anyErr?.code as string | undefined
      const message = anyErr?.message || 'Internal server error'
      const status =
        code === 'WORKSPACE_ACCESS_DENIED' ? 403 :
        code === 'RESOURCE_NOT_FOUND' ? 404 :
        code === 'INVITE_EXPIRED' ? 410 :
        code === 'INVITE_MAX_USES' ? 409 :
        code === 'INVITE_EMAIL_MISMATCH' ? 403 :
        500
      console.error('API error:', error)
      return NextResponse.json(
        { error: message, code: code || 'INTERNAL_SERVER_ERROR' },
        { status }
      )
    }
  }
}
