import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth/api-auth'
import { getUnreadNotificationCount } from '@/lib/db/notifications'

/**
 * GET /api/workspaces/[slug]/notifications/count
 * Get unread notification count for the current user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const { slug } = await params
    const context = await requireWorkspaceAccess(slug)

    const count = await getUnreadNotificationCount(
      context.user.dbUser.id,
      context.workspace.id
    )

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Failed to get notification count:', error)
    return NextResponse.json(
      {
        error: 'Failed to get notification count',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
