import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPlatformSuperAdmin } from '@/lib/auth/rbac';
import { getUserBySupabaseId } from '@/lib/db/queries';
import { createClient } from '@/lib/supabase/server';
import { createInviteCode, logActivityEvent } from '@/lib/db/queries';
import { sendInviteEmail } from '@/lib/email/smtp';
import { renderInviteEmail } from '@/lib/email/templates/invite';

/**
 * POST /api/admin/workspaces
 * Platform admin endpoint to create workspace with admin user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify platform admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isPlatformAdmin = isPlatformSuperAdmin(dbUser);
    if (!isPlatformAdmin) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { workspace, admin } = body;

    // Validate workspace data
    if (!workspace?.name || !workspace?.slug) {
      return NextResponse.json(
        { error: 'Workspace name and slug are required' },
        { status: 400 }
      );
    }

    // Validate admin data
    if (!admin?.email || !admin?.firstName || !admin?.lastName) {
      return NextResponse.json(
        { error: 'Admin email, first name, and last name are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(workspace.slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Create workspace and admin in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if slug already exists
      const existingWorkspace = await tx.workspace.findUnique({
        where: { slug: workspace.slug }
      });

      if (existingWorkspace) {
        throw new Error('Workspace slug already exists');
      }

      // Create workspace
      const newWorkspace = await tx.workspace.create({
        data: {
          name: workspace.name,
          slug: workspace.slug,
          tenantId: workspace.slug,
          active: true,
          published: true,
        } as any,
      });

      // Check if admin user exists
      const lowerEmail = admin.email.trim().toLowerCase();
      const existingAdmin = await tx.user.findUnique({
        where: { email: lowerEmail }
      });

      // Create or update admin user
      const adminUser = existingAdmin || await tx.user.create({
        data: {
          email: lowerEmail,
          isPending: true,
          firstName: admin.firstName,
          lastName: admin.lastName,
          phone: admin.phone || null,
          company: admin.company || null,
          jobTitle: admin.jobTitle || null,
          department: admin.department || null,
        } as any,
      });

      // Create workspace membership for admin
      await tx.workspaceMembership.create({
        data: {
          userId: adminUser.id,
          workspaceId: newWorkspace.id,
          role: 'ADMIN',
          isPrimary: true,
          isOwner: true,
        }
      });

      // Create invite code for admin
      // Use adminUser.id as creator since they have ADMIN membership in the new workspace
      const invite = await createInviteCode(
        {
          role: 'ADMIN',
          maxUses: 1,
          targetEmail: lowerEmail
        },
        newWorkspace.id,
        adminUser.id
      );

      return { workspace: newWorkspace, adminUser, invite };
    });

    // Send invitation email (best-effort)
    try {
      const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      const host = request.headers.get('host') || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
      const baseUrl = `${proto}://${host}`;
      const inviteUrl = `${baseUrl}/invite/${result.invite.code}`;

      const html = renderInviteEmail({
        workspaceName: result.workspace.name,
        inviterEmail: dbUser.email,
        inviterFirstName: dbUser.firstName,
        inviterLastName: dbUser.lastName,
        inviterDisplayName: dbUser.displayName,
        role: 'ADMIN',
        inviteUrl,
        expiresAt: result.invite.expiresAt,
        challengeTitle: null
      });

      await sendInviteEmail({
        to: result.adminUser.email,
        subject: `You're invited to admin ${result.workspace.name}`,
        html
      });

      await logActivityEvent({
        workspaceId: result.workspace.id,
        challengeId: null,
        actorUserId: dbUser.id,
        type: 'INVITE_SENT',
        metadata: { inviteCode: result.invite.code, recipients: [result.adminUser.email], via: 'email' }
      });
    } catch (error) {
      console.error('Failed to send admin invitation email:', error);
    }

    return NextResponse.json({
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
      },
      admin: {
        id: result.adminUser.id,
        email: result.adminUser.email,
      },
      invite: {
        code: result.invite.code,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
