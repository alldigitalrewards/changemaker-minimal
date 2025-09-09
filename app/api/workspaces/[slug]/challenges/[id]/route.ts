import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth';
import { getChallengeActivities } from '@/lib/db/queries';

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

  // Also get activities for this challenge
  const activities = await getChallengeActivities(id, workspace.id);

  return NextResponse.json({ challenge, activities });
});

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);

  const body = await request.json();
  const { title, description, startDate, endDate, enrollmentDeadline, participantIds, invitedParticipantIds, enrolledParticipantIds } = body;

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

  // Handle participant updates
  const shouldUpdateParticipants = invitedParticipantIds !== undefined || enrolledParticipantIds !== undefined || participantIds !== undefined;
  
  if (shouldUpdateParticipants) {
    try {
      // Remove all existing enrollments for this challenge (we'll recreate them)
      await prisma.enrollment.deleteMany({
        where: {
          challengeId: id,
        },
      });

      // Create invited participants
      if (invitedParticipantIds && invitedParticipantIds.length > 0) {
        const validInvitedParticipants = await prisma.user.findMany({
          where: {
            id: { in: invitedParticipantIds },
            workspaceId: workspace.id,
          },
        });

        if (validInvitedParticipants.length > 0) {
          await prisma.enrollment.createMany({
            data: validInvitedParticipants.map(participant => ({
              userId: participant.id,
              challengeId: id,
              status: 'INVITED',
            })),
            skipDuplicates: true,
          });
        }
      }

      // Create enrolled participants
      if (enrolledParticipantIds && enrolledParticipantIds.length > 0) {
        const validEnrolledParticipants = await prisma.user.findMany({
          where: {
            id: { in: enrolledParticipantIds },
            workspaceId: workspace.id,
          },
        });

        if (validEnrolledParticipants.length > 0) {
          await prisma.enrollment.createMany({
            data: validEnrolledParticipants.map(participant => ({
              userId: participant.id,
              challengeId: id,
              status: 'ENROLLED',
            })),
            skipDuplicates: true,
          });
        }
      }

      // Legacy support: if only participantIds is provided, treat as invited
      if (participantIds && participantIds.length > 0 && !invitedParticipantIds && !enrolledParticipantIds) {
        const validParticipants = await prisma.user.findMany({
          where: {
            id: { in: participantIds },
            workspaceId: workspace.id,
          },
        });

        if (validParticipants.length > 0) {
          await prisma.enrollment.createMany({
            data: validParticipants.map(participant => ({
              userId: participant.id,
              challengeId: id,
              status: 'INVITED',
            })),
            skipDuplicates: true,
          });
        }
      }
    } catch (error) {
      console.error('Error updating challenge participants:', error);
      // Continue even if participant update fails - challenge was updated successfully
    }
  }

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

// Participants endpoint has been moved to /app/api/workspaces/[slug]/participants/route.ts