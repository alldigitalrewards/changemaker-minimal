import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth'
import {
  createWorkspaceInvite,
  listWorkspaceInvites,
  revokeInviteCode
} from '@/lib/db/invitations'

type Params = Promise<{ slug: string }>

/**
 * GET /api/workspaces/[slug]/invites
 * List all invitations for the workspace (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { slug } = await params
    const { workspace } = await requireWorkspaceAdmin(slug)

    const invites = await listWorkspaceInvites(workspace.id)

    return NextResponse.json({ invites })
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error
    }
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workspaces/[slug]/invites
 * Create a new workspace invitation (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { slug } = await params
    const { workspace, user } = await requireWorkspaceAdmin(slug)

    const body = await request.json()
    const {
      role = 'PARTICIPANT',
      targetEmail = null,
      expiresInDays = 30,
      maxUses = 1,
      challengeId = null
    } = body

    // Validate role
    if (!['ADMIN', 'PARTICIPANT'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Create invitation
    const result = await createWorkspaceInvite({
      workspaceId: workspace.id,
      createdBy: user.dbUser.id,
      role,
      targetEmail,
      expiresInDays,
      maxUses,
      challengeId
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      inviteId: result.id
    })
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workspaces/[slug]/invites?inviteId=xxx
 * Revoke an invitation (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { slug } = await params
    await requireWorkspaceAdmin(slug)

    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('inviteId')

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      )
    }

    const success = await revokeInviteCode(inviteId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to revoke invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully'
    })
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Error revoking invitation:', error)
    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    )
  }
}
