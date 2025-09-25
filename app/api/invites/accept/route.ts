import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, withErrorHandling } from '@/lib/auth/api-auth'
import { acceptInviteCode, logActivityEvent } from '@/lib/db/queries'
import { rateLimit } from '@/lib/rate-limit'
import type { InviteCodeAcceptRequest, InviteCodeAcceptResponse } from '@/lib/types'

export const POST = withErrorHandling(async (
  request: NextRequest
) => {
  // Basic rate limit per IP+code to reduce brute forcing
  const ip = request.headers.get('x-forwarded-for') || 'local'
  let codeForKey = 'unknown'
  try {
    const peek = await request.clone().json()
    if (peek && typeof peek.code === 'string') {
      codeForKey = peek.code
    }
  } catch (_) {}
  const rl = rateLimit(`invite-accept:${ip}:${codeForKey}`, 5, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts', code: 'RATE_LIMITED', retryAfter: rl.retryAfter }, { status: 429 })
  }
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
    challenge: result.challenge || undefined,
    role: result.role as any
  }

  // Log invite redemption
  await logActivityEvent({
    workspaceId: result.workspace.id,
    challengeId: result.challenge?.id || null,
    userId: user.dbUser.id,
    actorUserId: user.dbUser.id,
    type: 'INVITE_REDEEMED',
    metadata: { code: body.code, enrolled: Boolean(result.enrollment) }
  })

  return NextResponse.json(response, { status: 200 })
})