import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth';

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace, user } = await requireWorkspaceAccess(slug);

  const challenge = await prisma.challenge.findFirst({
    where: {
      id,
      workspaceId: workspace.id,
    },
    include: {
      enrollments: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  return NextResponse.json(challenge);
});

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);

  const body = await request.json();
  const { title, description } = body;

  if (!title || !description) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
  }

  const challenge = await prisma.challenge.update({
    where: {
      id,
    },
    data: {
      title,
      description,
    },
  });

  return NextResponse.json(challenge);
});

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);

  // Delete related enrollments first
  await prisma.enrollment.deleteMany({
    where: {
      challengeId: id,
    },
  });

  // Then delete the challenge
  await prisma.challenge.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({ success: true });
});