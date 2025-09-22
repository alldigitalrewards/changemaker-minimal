import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling, requireWorkspaceAdmin } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'
import { createInviteCode, logActivityEvent } from '@/lib/db/queries'
import { sendInviteEmail } from '@/lib/email/smtp'
import { renderInviteEmail } from '@/lib/email/templates/invite'
import { rateLimit } from '@/lib/rate-limit'

type BulkInviteItem = {
  email: string
  role?: 'ADMIN' | 'PARTICIPANT'
  name?: string
}

type BulkInviteResult = {
  email: string
  role: 'ADMIN' | 'PARTICIPANT'
  status: 'invited' | 'skipped' | 'error'
  message?: string
  inviteCode?: string
}

function parseTextList(bodyText: string): BulkInviteItem[] {
  const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const items: BulkInviteItem[] = []
  for (const line of lines) {
    // Support CSV: email,role,name or just email
    const parts = line.split(',').map(p => p.trim()).filter(p => p.length > 0)
    if (parts.length === 0) continue
    const [email, roleMaybe, nameMaybe] = parts
    items.push({
      email,
      role: (roleMaybe === 'ADMIN' || roleMaybe === 'PARTICIPANT') ? roleMaybe : undefined,
      name: nameMaybe
    })
  }
  return items
}

function parseJson(body: any): BulkInviteItem[] {
  if (Array.isArray(body)) return body as BulkInviteItem[]
  if (Array.isArray(body?.items)) return body.items as BulkInviteItem[]
  return []
}

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params
  const { workspace, user } = await requireWorkspaceAdmin(slug)

  // Rate limit higher burst but still bounded
  const ip = request.headers.get('x-forwarded-for') || 'local'
  const rl = rateLimit(`participants-bulk:${workspace.id}:${user.dbUser.id}:${ip}`, 50, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.', code: 'RATE_LIMITED', retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  const contentType = request.headers.get('content-type') || ''
  let items: BulkInviteItem[] = []
  if (contentType.includes('application/json')) {
    const body = await request.json()
    items = parseJson(body)
  } else {
    const text = await request.text()
    items = parseTextList(text)
  }

  // Basic validation and normalization
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  items = items
    .map(i => ({
      email: (i.email || '').trim().toLowerCase(),
      role: (i.role === 'ADMIN' || i.role === 'PARTICIPANT') ? i.role : 'PARTICIPANT',
      name: (i.name || '').trim() || undefined
    }))
    .filter(i => i.email.length > 0)

  if (items.length === 0) {
    return NextResponse.json({ error: 'No valid items provided' }, { status: 400 })
  }

  // Build base URL for invite links
  const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const host = request.headers.get('host') || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
  const baseUrl = `${proto}://${host}`

  // Process sequentially to simplify rate/dup checks; size expected modest
  const results: BulkInviteResult[] = []
  for (const item of items) {
    if (!emailRegex.test(item.email)) {
      results.push({ email: item.email, role: item.role!, status: 'skipped', message: 'invalid_email' })
      continue
    }

    try {
      const { userRecord, invite } = await prisma.$transaction(async (tx) => {
        const existingByEmail = await tx.user.findUnique({ where: { email: item.email } })
        const userRecord = existingByEmail || await tx.user.create({
          data: ({ email: item.email, role: item.role, isPending: true } as any)
        })

        const membership = await tx.workspaceMembership.findUnique({
          where: { userId_workspaceId: { userId: userRecord.id, workspaceId: workspace.id } }
        })
        if (!membership) {
          await tx.workspaceMembership.create({
            data: { userId: userRecord.id, workspaceId: workspace.id, role: item.role!, isPrimary: false }
          })
        }

        const invite = await createInviteCode({ role: item.role!, maxUses: 1, targetEmail: item.email }, workspace.id, user.dbUser.id)
        return { userRecord, invite }
      })

      const inviteUrl = `${baseUrl}/invite/${invite.code}`
      // Best-effort email
      try {
        const html = renderInviteEmail({
          workspaceName: workspace.name,
          inviterEmail: user.dbUser.email,
          role: item.role!,
          inviteUrl,
          expiresAt: invite.expiresAt,
          challengeTitle: null
        })
        await sendInviteEmail({ to: item.email, subject: `You're invited to join ${workspace.name}`, html })
        await logActivityEvent({
          workspaceId: workspace.id,
          challengeId: null,
          actorUserId: user.dbUser.id,
          type: 'INVITE_SENT',
          metadata: { inviteCode: invite.code, recipients: [item.email], via: 'email', bulk: true }
        })
      } catch (e) {
        // Keep going; email failures shouldn't fail the whole row
        console.error('Bulk invite email failure for', item.email, e)
      }

      results.push({ email: item.email, role: item.role!, status: 'invited', inviteCode: invite.code })
    } catch (e: any) {
      console.error('Bulk invite error for', item.email, e)
      results.push({ email: item.email, role: item.role!, status: 'error', message: 'db_error' })
    }
  }

  const invited = results.filter(r => r.status === 'invited').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({ summary: { invited, skipped, errors, total: results.length }, results })
})


