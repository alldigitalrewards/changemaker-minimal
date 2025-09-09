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