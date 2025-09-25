import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';
import { createInviteCode, logActivityEvent } from '@/lib/db/queries';
import { sendInviteEmail } from '@/lib/email/smtp';
import { renderInviteEmail } from '@/lib/email/templates/invite';
import { rateLimit } from '@/lib/rate-limit';

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params;
  const { workspace } = await requireWorkspaceAccess(slug);

  const memberships = await prisma.workspaceMembership.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'asc' }
  })

  const participants = memberships.map(m => ({
    id: m.user.id,
    email: m.user.email,
    role: m.role,
  }));

  return NextResponse.json({ participants });
});

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);

  const body = await request.json();
  const { email, role, name } = body;

  // Rate limit per admin+workspace to prevent abuse
  const ip = request.headers.get('x-forwarded-for') || 'local'
  const rl = rateLimit(`participants-add:${workspace.id}:${user.dbUser.id}:${ip}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many invites. Please wait a moment.', code: 'RATE_LIMITED', retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  // Basic validation
  if (!email || !role) {
    return NextResponse.json(
      { error: 'Email and role are required' },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    );
  }

  // Validate role
  if (!['ADMIN', 'PARTICIPANT'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be ADMIN or PARTICIPANT' },
      { status: 400 }
    );
  }

  try {
    const lowerEmail = email.trim().toLowerCase()

    const result = await prisma.$transaction(async (tx) => {
      const existingByEmail = await tx.user.findUnique({ where: { email: lowerEmail } })

      const userRecord = existingByEmail || await tx.user.create({
        data: {
          email: lowerEmail,
          role,
          isPending: true,
        } as any,
      })

      const membership = await tx.workspaceMembership.findUnique({
        where: { userId_workspaceId: { userId: userRecord.id, workspaceId: workspace.id } }
      })
      if (!membership) {
        await tx.workspaceMembership.create({
          data: {
            userId: userRecord.id,
            workspaceId: workspace.id,
            role,
            isPrimary: false
          }
        })
      }

      const invite = await createInviteCode({ role: role, maxUses: 1, targetEmail: lowerEmail }, workspace.id, user.dbUser.id)

      return { userRecord, invite }
    })

    // Build base URL that works in local/preview/prod
    const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const host = request.headers.get('host') || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
    const baseUrl = `${proto}://${host}`
    const inviteUrl = `${baseUrl}/invite/${result.invite.code}`

    // Send email (best-effort)
    try {
      const html = renderInviteEmail({
        workspaceName: workspace.name,
        inviterEmail: user.dbUser.email,
        role,
        inviteUrl,
        expiresAt: result.invite.expiresAt,
        challengeTitle: null
      })
      await sendInviteEmail({
        to: lowerEmail,
        subject: `You're invited to join ${workspace.name}`,
        html
      })
      await logActivityEvent({
        workspaceId: workspace.id,
        challengeId: null,
        actorUserId: user.dbUser.id,
        type: 'INVITE_SENT',
        metadata: { inviteCode: result.invite.code, recipients: [lowerEmail], via: 'email' }
      })
    } catch (e) {
      console.error('Failed to send invite email:', e)
    }

    return NextResponse.json(
      { 
        user: {
          id: result.userRecord.id,
          email: result.userRecord.email,
          role: result.userRecord.role,
          workspaceId: result.userRecord.workspaceId,
        },
        invite: { code: result.invite.code, url: inviteUrl }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
});

// TODO: Create separate activity-submissions API route