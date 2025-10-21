import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params;
  const { workspace } = await requireWorkspaceAccess(slug);

  const segments = await prisma.workspaceParticipantSegment.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ segments });
});

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);

  const body = await request.json();
  const { name, description, filterJson } = body;

  if (!name) {
    return NextResponse.json(
      { error: 'Segment name is required' },
      { status: 400 }
    );
  }

  const segment = await prisma.workspaceParticipantSegment.create({
    data: {
      name,
      description: description || null,
      filterJson: filterJson || {},
      workspaceId: workspace.id,
      createdBy: user.dbUser.id
    }
  });

  return NextResponse.json({ segment });
});
