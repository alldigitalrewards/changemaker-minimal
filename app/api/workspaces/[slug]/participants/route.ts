import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess, withErrorHandling } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';
import { createInviteCode, logActivityEvent } from '@/lib/db/queries';
import { sendInviteEmail } from '@/lib/email/smtp';
import { renderInviteEmail } from '@/lib/email/templates/invite';

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params;
  const { workspace } = await requireWorkspaceAccess(slug);

  const users = await prisma.user.findMany({
    where: {
      workspaceId: workspace.id,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
    orderBy: {
      email: 'asc',
    },
  });

  const participants = users.map(user => ({
    id: user.id,
    email: user.email,
    role: user.role,
  }));

  return NextResponse.json({ participants });
});

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params;
  const { workspace, user } = await requireWorkspaceAccess(slug);

  const body = await request.json();
  const { email, role, name } = body;

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
    // Check if user with this email already exists in this workspace
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        workspaceId: workspace.id,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists in workspace' },
        { status: 409 }
      );
    }

    // Create the user account (without Supabase connection initially)
    const newUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        role,
        workspaceId: workspace.id,
        // Note: supabaseUserId will be set when they sign up via Supabase Auth
      },
    });

    // Generate a workspace invite code limited to a single use
    const invite = await createInviteCode({ role: 'PARTICIPANT', maxUses: 1 }, workspace.id, user.dbUser.id)

    // Build base URL that works in local/preview/prod
    const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const host = request.headers.get('host') || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
    const baseUrl = `${proto}://${host}`
    const inviteUrl = `${baseUrl}/invite/${invite.code}`

    // Send email (best-effort)
    try {
      const html = renderInviteEmail({
        workspaceName: workspace.name,
        inviterEmail: user.dbUser.email,
        role,
        inviteUrl,
        expiresAt: invite.expiresAt,
        challengeTitle: null
      })
      await sendInviteEmail({
        to: email.trim().toLowerCase(),
        subject: `You're invited to join ${workspace.name}`,
        html
      })
      await logActivityEvent({
        workspaceId: workspace.id,
        challengeId: null,
        actorUserId: user.dbUser.id,
        type: 'INVITE_SENT',
        metadata: { inviteCode: invite.code, recipients: [email.trim().toLowerCase()], via: 'email' }
      })
    } catch (e) {
      console.error('Failed to send invite email:', e)
    }

    return NextResponse.json(
      { 
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          workspaceId: newUser.workspaceId,
        },
        invite: { code: invite.code, url: inviteUrl }
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