import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/api-auth'
import { redeemInviteCode } from '@/lib/db/invitations'

/**
 * POST /api/invites/redeem
 * Redeem an invite code (authenticated users)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    const result = await redeemInviteCode(
      code.toUpperCase(),
      user.dbUser.id,
      user.dbUser.email
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to redeem invite code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      workspaceId: result.workspaceId,
      challengeId: result.challengeId
    })
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Error redeeming invite code:', error)
    return NextResponse.json(
      { error: 'Failed to redeem invite code' },
      { status: 500 }
    )
  }
}
