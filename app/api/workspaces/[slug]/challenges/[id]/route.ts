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

  return NextResponse.json({ challenge });
});

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);

  const body = await request.json();
  const { title, description, startDate, endDate, enrollmentDeadline } = body;

  // Basic validation
  if (!title || !description) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
  }

  // Prepare update data - only include fields that are provided
  const updateData: any = { title, description };

  // Handle timeline fields if provided
  if (startDate || endDate || enrollmentDeadline !== undefined) {
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Both startDate and endDate are required when updating timeline' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (end <= start) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    updateData.startDate = start;
    updateData.endDate = end;
    updateData.enrollmentDeadline = enrollmentDeadline ? new Date(enrollmentDeadline) : start;

    // Validate enrollment deadline
    if (enrollmentDeadline) {
      const enrollDeadline = new Date(enrollmentDeadline);
      if (isNaN(enrollDeadline.getTime()) || enrollDeadline > start) {
        return NextResponse.json({ error: 'Enrollment deadline must be before or equal to start date' }, { status: 400 });
      }
    }
  }

  const challenge = await prisma.challenge.update({
    where: {
      id,
    },
    data: updateData,
  });

  return NextResponse.json({ challenge });
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