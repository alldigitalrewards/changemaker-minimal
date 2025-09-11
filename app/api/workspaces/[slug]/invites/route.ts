import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth'
import { createInviteCode, getWorkspaceInviteCodes } from '@/lib/db/queries'
import { validateInviteCodeData } from '@/lib/types'
import type { InviteCodeCreateRequest, InviteCodeCreateResponse } from '@/lib/types'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params
  const { workspace, user } = await requireWorkspaceAdmin(slug)

  const inviteCodes = await getWorkspaceInviteCodes(workspace.id)

  return NextResponse.json({ inviteCodes })
})

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params
  const { workspace, user } = await requireWorkspaceAdmin(slug)

  const body = await request.json()

  if (!validateInviteCodeData(body)) {
    return NextResponse.json({ error: 'Invalid invite code data' }, { status: 400 })
  }

  const inviteCode = await createInviteCode(
    {
      challengeId: body.challengeId,
      role: body.role,
      expiresIn: body.expiresIn,
      maxUses: body.maxUses
    },
    workspace.id,
    user.dbUser.id
  )

  return NextResponse.json({ inviteCode }, { status: 201 })
})