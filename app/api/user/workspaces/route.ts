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

    // Get user's accessible workspaces
    const workspaces = await getUserAccessibleWorkspaces(dbUser.id)

    return NextResponse.json({
      workspaces: workspaces.map(workspace => ({
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        // Include any additional workspace metadata if needed
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