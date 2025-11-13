import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
} from '@/lib/db/notifications'
import {
  getWorkspaceBySlug,
  getUserBySupabaseId,
  verifyWorkspaceAccess,
  DatabaseError,
  WorkspaceAccessError,
} from '@/lib/db/queries'
import type { Notification } from '@prisma/client'

interface NotificationListResponse {
  notifications: Notification[]
  unreadCount: number
}

interface NotificationActionResponse {
  success: boolean
  count?: number
}

interface ApiError {
  error: string
}

/**
 * GET /api/workspaces/[slug]/notifications
 * Fetch user's notifications for the workspace
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<NotificationListResponse | ApiError>> {
  try {
    const { slug } = await context.params
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const includeRead = searchParams.get('includeRead') === 'true'
    const includeDismissed = searchParams.get('includeDismissed') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

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

    // Fetch notifications for this user in this workspace
    const notifications = await getUserNotifications(dbUser.id, workspace.id, {
      includeRead,
      includeDismissed,
      limit,
      offset,
    })

    // Get unread count
    const unreadCount = await getUnreadNotificationCount(dbUser.id, workspace.id)

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workspaces/[slug]/notifications (with action=read-all)
 * Mark all notifications as read for the user in this workspace
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<NotificationActionResponse | ApiError>> {
  try {
    const { slug } = await context.params
    const body = await request.json()
    const { action } = body

    // Only support read-all action in this route
    if (action !== 'read-all') {
      return NextResponse.json(
        { error: 'Invalid action. Use action=read-all or use specific notification routes.' },
        { status: 400 }
      )
    }

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

    // Mark all notifications as read
    const count = await markAllNotificationsAsRead(dbUser.id, workspace.id)

    return NextResponse.json({
      success: true,
      count,
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}
