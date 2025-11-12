import { NextRequest, NextResponse } from 'next/server'
import { getInviteByCode } from '@/lib/db/queries'
import { prisma } from '@/lib/prisma'

type Params = Promise<{ code: string }>

/**
 * GET /api/invites/[code]/details
 * Get invite details including participant data for signup page
 * Public endpoint - no auth required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { code } = await params

    // Get invite details
    const invite = await getInviteByCode(code)

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    // Check if invite is valid
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 410 }
      )
    }

    if (invite.usedCount >= invite.maxUses) {
      return NextResponse.json(
        { error: 'Invite has reached maximum uses' },
        { status: 410 }
      )
    }

    // Get target email from invite
    const targetEmail = (invite as any).targetEmail

    if (!targetEmail) {
      return NextResponse.json({
        email: '',
        workspaceName: invite.workspace.name,
        role: invite.role
      })
    }

    // Look up participant data if target email exists
    const participant = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: {
        email: true,
        firstName: true,
        lastName: true
      }
    })

    return NextResponse.json({
      email: targetEmail,
      firstName: participant?.firstName || undefined,
      lastName: participant?.lastName || undefined,
      workspaceName: invite.workspace.name,
      role: invite.role
    })
  } catch (error) {
    console.error('Error fetching invite details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invite details' },
      { status: 500 }
    )
  }
}
