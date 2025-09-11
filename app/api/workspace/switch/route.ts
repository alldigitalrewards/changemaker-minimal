/**
 * Workspace Switch API
 * 
 * Handles workspace switching with membership verification and persistence.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasWorkspaceAccess } from '@/lib/auth/workspace-context'
import { getUserBySupabaseId, getWorkspaceBySlug } from '@/lib/db/queries'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json()

    if (!slug) {
      return NextResponse.json(
        { error: 'Workspace slug is required' },
        { status: 400 }
      )
    }

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

    // Verify workspace exists
    const workspace = await getWorkspaceBySlug(slug)
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this workspace
    const hasAccess = await hasWorkspaceAccess(user.id, slug)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    // Set workspace preference cookie (30 days)
    const cookieStore = await cookies()
    cookieStore.set('lastWorkspaceId', slug, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name
      }
    })

  } catch (error) {
    console.error('Error switching workspace:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}