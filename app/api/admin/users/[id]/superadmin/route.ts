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

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Grant platform super admin access
    if (!targetUser.platformSuperAdmin) {
      await prisma.user.update({
        where: { id },
        data: {
          platformSuperAdmin: true
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error granting superadmin:', error);
    return NextResponse.json(
      { error: 'Failed to grant superadmin access' },
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

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Revoke platform super admin access
    if (targetUser.platformSuperAdmin) {
      await prisma.user.update({
        where: { id },
        data: {
          platformSuperAdmin: false
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking superadmin:', error);
    return NextResponse.json(
      { error: 'Failed to revoke superadmin access' },
      { status: 500 }
    );
  }
}
