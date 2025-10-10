import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { isPlatformSuperAdmin } from '@/lib/auth/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workspaceId, role = 'PARTICIPANT' } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is superadmin
    const currentUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    if (!isPlatformSuperAdmin(currentUser?.permissions, user.email!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { memberships: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if membership already exists
    const existingMembership = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: id,
          workspaceId
        }
      }
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 400 }
      );
    }

    // Create membership
    const isPrimary = targetUser.memberships.length === 0;

    await prisma.workspaceMembership.create({
      data: {
        userId: id,
        workspaceId,
        role,
        isPrimary
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding user to workspace:', error);
    return NextResponse.json(
      { error: 'Failed to add user to workspace' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is superadmin
    const currentUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    if (!isPlatformSuperAdmin(currentUser?.permissions, user.email!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if membership exists
    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: id,
          workspaceId
        }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    // If this was the primary workspace, we need to set another as primary
    if (membership.isPrimary) {
      const otherMembership = await prisma.workspaceMembership.findFirst({
        where: {
          userId: id,
          workspaceId: { not: workspaceId }
        }
      });

      if (otherMembership) {
        await prisma.workspaceMembership.update({
          where: {
            userId_workspaceId: {
              userId: id,
              workspaceId: otherMembership.workspaceId
            }
          },
          data: { isPrimary: true }
        });
      }
    }

    // Delete membership
    await prisma.workspaceMembership.delete({
      where: {
        userId_workspaceId: {
          userId: id,
          workspaceId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing user from workspace:', error);
    return NextResponse.json(
      { error: 'Failed to remove user from workspace' },
      { status: 500 }
    );
  }
}
