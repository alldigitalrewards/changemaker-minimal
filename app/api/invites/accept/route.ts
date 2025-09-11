import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, withErrorHandling } from '@/lib/auth/api-auth'
import { acceptInviteCode } from '@/lib/db/queries'
import type { InviteCodeAcceptRequest, InviteCodeAcceptResponse } from '@/lib/types'

export const POST = withErrorHandling(async (
  request: NextRequest
) => {
  const user = await requireAuth()
  
  const body: InviteCodeAcceptRequest = await request.json()
  
  if (!body.code || typeof body.code !== 'string' || body.code.trim().length === 0) {
    return NextResponse.json({ error: 'Valid invite code is required' }, { status: 400 })
  }

  const result = await acceptInviteCode(body.code, user.dbUser.id, user.dbUser.email)

  const response: InviteCodeAcceptResponse = {
    success: true,
    message: result.isExistingMember 
      ? `You were already a member of ${result.workspace.name}${result.enrollment ? ' and have been enrolled in the challenge' : ''}` 
      : `Welcome to ${result.workspace.name}!${result.enrollment ? ' You have been enrolled in the challenge.' : ''}`,
    workspace: result.workspace,
    challenge: result.challenge || undefined
  }

  return NextResponse.json(response, { status: 200 })
})