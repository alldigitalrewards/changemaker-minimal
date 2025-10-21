import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { isPlatformSuperAdmin } from '@/lib/auth/rbac';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workspaceId, role } = body;

    if (!workspaceId || !role) {
      return NextResponse.json(
        { error: 'Workspace ID and role are required' },
        { status: 400 }
      );
    }

    if (role !== 'ADMIN' && role !== 'PARTICIPANT') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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

    // Update the membership role
    await prisma.workspaceMembership.update({
      where: {
        userId_workspaceId: {
          userId: id,
          workspaceId
        }
      },
      data: { role }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
