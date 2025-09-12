/**
 * User Workspaces API
 * 
 * Returns all workspaces accessible to the current user.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserAccessibleWorkspaces } from '@/lib/auth/workspace-context'
import { getUserBySupabaseId } from '@/lib/db/queries'

export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get database user
    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's memberships with workspace details
    const { listMemberships } = await import('@/lib/db/workspace-membership')
    const memberships = await listMemberships(dbUser.id)

    return NextResponse.json({
      workspaces: memberships.map(membership => ({
        id: membership.workspace.id,
        slug: membership.workspace.slug,
        name: membership.workspace.name,
        role: membership.role,
        isPrimary: membership.isPrimary,
        joinedAt: membership.joinedAt,
      }))
    })

  } catch (error) {
    console.error('Error fetching user workspaces:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}