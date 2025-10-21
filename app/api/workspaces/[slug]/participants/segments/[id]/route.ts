import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace } = await requireWorkspaceAccess(slug);

  const segment = await prisma.workspaceParticipantSegment.findFirst({
    where: {
      id,
      workspaceId: workspace.id
    }
  });

  if (!segment) {
    return NextResponse.json(
      { error: 'Segment not found' },
      { status: 404 }
    );
  }

  // Get participants matching the segment filter
  const filterJson = segment.filterJson as Prisma.JsonObject || {};

  // Build where clause based on filter
  const whereClause: any = {
    WorkspaceMembership: {
      some: {
        workspaceId: workspace.id
      }
    }
  };

  // Apply filter conditions if they exist
  if (filterJson.role) {
    whereClause.role = filterJson.role;
  }
  if (filterJson.createdAfter) {
    whereClause.createdAt = {
      gte: new Date(filterJson.createdAfter as string)
    };
  }
  if (filterJson.status) {
    // This would need custom logic based on your status field
    // Keeping it flexible for future use
  }

  const participants = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  return NextResponse.json({ segment, participants });
});

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace } = await requireWorkspaceAdmin(slug);

  const segment = await prisma.workspaceParticipantSegment.findFirst({
    where: {
      id,
      workspaceId: workspace.id
    }
  });

  if (!segment) {
    return NextResponse.json(
      { error: 'Segment not found' },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { name, description, filterJson } = body;

  const updatedSegment = await prisma.workspaceParticipantSegment.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(filterJson !== undefined && { filterJson })
    }
  });

  return NextResponse.json({ segment: updatedSegment });
});

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace } = await requireWorkspaceAdmin(slug);

  const segment = await prisma.workspaceParticipantSegment.findFirst({
    where: {
      id,
      workspaceId: workspace.id
    }
  });

  if (!segment) {
    return NextResponse.json(
      { error: 'Segment not found' },
      { status: 404 }
    );
  }

  await prisma.workspaceParticipantSegment.delete({
    where: { id }
  });

  return NextResponse.json({ message: 'Segment deleted successfully' });
});
