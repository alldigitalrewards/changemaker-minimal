import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserBySupabaseId, getWorkspaceBySlug, verifyWorkspaceAdmin } from '@/lib/db/queries'
import { getUserWorkspaceRole } from '@/lib/db/workspace-compatibility'
import type { User } from '@supabase/supabase-js'
import type { User as PrismaUser, Workspace } from '@prisma/client'
import type { Role } from '@/lib/types'

export interface AuthenticatedUser {
  supabaseUser: User
  dbUser: PrismaUser
}

export interface WorkspaceContext {
  workspace: Workspace
  user: AuthenticatedUser
  role?: Role
}

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

  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) {
    throw NextResponse.json({ error: 'User not found in database' }, { status: 404 })
  }

  return { supabaseUser: user, dbUser }
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
  if (!role) {
    throw NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
  }

  return { workspace, user, role }
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
      
      console.error('API error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}