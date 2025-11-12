import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { createInviteCode, logActivityEvent } from "@/lib/db/queries";
import { sendInviteEmail } from "@/lib/email/smtp";
import { renderInviteEmail } from "@/lib/email/templates/invite";
import { rateLimit } from "@/lib/rate-limit";

type Params = Promise<{ slug: string }>;

/**
 * GET /api/workspaces/[slug]/participants
 * Get all participants (users) in a workspace
 * Used by workspace admins to see available users for reward issuance
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);

    const participants = await prisma.user.findMany({
      where: {
        WorkspaceMembership: {
          some: {
            workspaceId: workspace.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" },
        { email: "asc" },
      ],
    });

    return NextResponse.json({ participants });
  }
);

/**
 * POST /api/workspaces/[slug]/participants
 * Add a single participant to the workspace
 * Supports detailed profile data and custom invitation messages
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace, user } = await requireWorkspaceAdmin(slug);

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'local';
    const rl = rateLimit(`participants-add:${workspace.id}:${user.dbUser.id}:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.', code: 'RATE_LIMITED', retryAfter: rl.retryAfter },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      phone,
      company,
      jobTitle,
      department,
      role,
      sendInvite,
      customMessage
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, firstName, lastName' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate role
    const participantRole = (role === 'ADMIN' || role === 'PARTICIPANT') ? role : 'PARTICIPANT';

    // Check for duplicate membership
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      const existingMembership = await prisma.workspaceMembership.findUnique({
        where: {
          userId_workspaceId: {
            userId: existingUser.id,
            workspaceId: workspace.id
          }
        }
      });
      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace' },
          { status: 409 }
        );
      }
    }

    // Create user and membership in transaction
    const { participant, invite } = await prisma.$transaction(async (tx) => {
      // Create or get user
      const participant = await tx.user.upsert({
        where: { email: email.toLowerCase() },
        create: {
          email: email.toLowerCase(),
          firstName,
          lastName,
          phone: phone || null,
          company: company || null,
          jobTitle: jobTitle || null,
          department: department || null,
          isPending: true
        },
        update: {
          // Update profile data if user exists but not in this workspace
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phone || undefined,
          company: company || undefined,
          jobTitle: jobTitle || undefined,
          department: department || undefined,
        }
      });

      // Create workspace membership
      await tx.workspaceMembership.create({
        data: {
          userId: participant.id,
          workspaceId: workspace.id,
          role: participantRole,
          isPrimary: false
        }
      });

      // Generate invite code
      const inviteEmail = email.toLowerCase();
      console.log('[PARTICIPANT ADD] Creating invite:', {
        participantEmail: participant.email,
        targetEmail: inviteEmail,
        role: participantRole,
        workspaceId: workspace.id
      });

      const invite = await createInviteCode({
        role: participantRole,
        maxUses: 1,
        targetEmail: inviteEmail
      }, workspace.id, user.dbUser.id);

      console.log('[PARTICIPANT ADD] Invite created:', {
        code: invite.code,
        targetEmail: (invite as any).targetEmail,
        expiresAt: invite.expiresAt
      });

      return { participant, invite };
    });

    // Send invitation email if requested (default true)
    if (sendInvite !== false) {
      const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      const host = request.headers.get('host') || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
      const inviteUrl = `${proto}://${host}/invite/${invite.code}`;

      const html = renderInviteEmail({
        workspaceName: workspace.name,
        inviterEmail: user.dbUser.email,
        inviterFirstName: user.dbUser.firstName,
        inviterLastName: user.dbUser.lastName,
        inviterDisplayName: user.dbUser.displayName,
        role: participantRole,
        inviteUrl,
        expiresAt: invite.expiresAt,
        challengeTitle: null,
        customMessage: customMessage || null
      });

      await sendInviteEmail({
        to: email.toLowerCase(),
        subject: `You're invited to join ${workspace.name}`,
        html
      });

      await logActivityEvent({
        workspaceId: workspace.id,
        challengeId: null,
        actorUserId: user.dbUser.id,
        type: 'INVITE_SENT',
        metadata: {
          inviteCode: invite.code,
          recipients: [email.toLowerCase()],
          via: 'email'
        }
      });
    }

    // Return success response
    return NextResponse.json({
      participant: {
        id: participant.id,
        email: participant.email,
        firstName: participant.firstName,
        lastName: participant.lastName,
        phone: participant.phone,
        company: participant.company,
        jobTitle: participant.jobTitle,
        department: participant.department,
        role: participantRole
      },
      inviteCode: sendInvite !== false ? invite.code : undefined,
      inviteUrl: sendInvite !== false ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}/invite/${invite.code}` : undefined
    });
  }
);
