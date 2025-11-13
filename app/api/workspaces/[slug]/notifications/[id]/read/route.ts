import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markNotificationAsRead } from '@/lib/db/notifications'
import {
  getWorkspaceBySlug,
  getUserBySupabaseId,
  verifyWorkspaceAccess,
  DatabaseError,
  WorkspaceAccessError,
} from '@/lib/db/queries'
import type { Notification } from '@prisma/client'

interface NotificationActionResponse {
  success: boolean
  notification: Notification
}

interface ApiError {
  error: string
}

/**
 * POST /api/workspaces/[slug]/notifications/[id]/read
 * Mark a specific notification as read
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; id: string }> }
): Promise<NextResponse<NotificationActionResponse | ApiError>> {
  try {
    const { slug, id: notificationId } = await context.params

    // Verify authentication
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get workspace with validation
    const workspace = await getWorkspaceBySlug(slug)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Verify user exists
    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user has workspace membership (CRITICAL SECURITY CHECK)
    const hasAccess = await verifyWorkspaceAccess(dbUser.id, workspace.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    // Mark notification as read (includes ownership check in function)
    const notification = await markNotificationAsRead(notificationId, dbUser.id)

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Handle case where notification not found or doesn't belong to user
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}
