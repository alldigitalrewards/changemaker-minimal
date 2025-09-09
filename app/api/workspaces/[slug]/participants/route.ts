import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess, withErrorHandling } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';

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
  const { workspace } = await requireWorkspaceAccess(slug);

  const body = await request.json();
  const { email, role } = body;

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

    return NextResponse.json(
      { 
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          workspaceId: newUser.workspaceId,
        }
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