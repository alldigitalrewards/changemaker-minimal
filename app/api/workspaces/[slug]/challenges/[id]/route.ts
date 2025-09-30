import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth';
import { getChallengeActivities, logActivityEvent } from '@/lib/db/queries';

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
  const { title, description, startDate, endDate, enrollmentDeadline, rewardType, rewardConfig, participantIds, invitedParticipantIds, enrolledParticipantIds } = body;

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

  // Reward configuration (optional)
  if (rewardType !== undefined) {
    if (!['points', 'sku', 'monetary', null].includes(rewardType)) {
      return NextResponse.json({ error: 'Invalid rewardType' }, { status: 400 });
    }
    updateData.rewardType = rewardType || null
  }
  if (rewardConfig !== undefined) {
    updateData.rewardConfig = rewardConfig
  }

  const before = await prisma.challenge.findUnique({ where: { id } })
  const challenge = await prisma.challenge.update({
    where: {
      id,
    },
    data: updateData,
  });

  // Log challenge updated with minimal diff
  try {
    const changed: Record<string, any> = {}
    if (before) {
      if (before.title !== challenge.title) changed.title = { from: before.title, to: challenge.title }
      if (before.description !== challenge.description) changed.description = { changed: true }
      if (+new Date(before.startDate) !== +new Date(challenge.startDate)) changed.startDate = { from: before.startDate, to: challenge.startDate }
      if (+new Date(before.endDate) !== +new Date(challenge.endDate)) changed.endDate = { from: before.endDate, to: challenge.endDate }
      if ((before.enrollmentDeadline || null) !== (challenge.enrollmentDeadline || null)) changed.enrollmentDeadline = { from: before.enrollmentDeadline, to: challenge.enrollmentDeadline }
    }
    if (Object.keys(changed).length > 0) {
      await (await import('@/lib/db/queries')).logActivityEvent({
        workspaceId: workspace.id,
        challengeId: id,
        actorUserId: user.dbUser.id,
        type: 'CHALLENGE_UPDATED' as any,
        metadata: { changed }
      })
    }
  } catch {}

  // Handle participant updates
  const shouldUpdateParticipants = invitedParticipantIds !== undefined || enrolledParticipantIds !== undefined || participantIds !== undefined;
  
  if (shouldUpdateParticipants) {
    try {
      // Snapshot previous enrollments to compute diffs for event logs
      const previousEnrollments = await prisma.enrollment.findMany({
        where: { challengeId: id },
        include: { user: true }
      })

      const prevByUserId = new Map(previousEnrollments.map(e => [e.userId, e]))

      // Compute final target sets from payload
      const targetInvited = new Set<string>(invitedParticipantIds || (participantIds && !enrolledParticipantIds ? participantIds : []))
      const targetEnrolled = new Set<string>(enrolledParticipantIds || [])
      const targetAll = new Set<string>([...targetInvited, ...targetEnrolled])

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

          // Log INVITE_SENT for new invites
          for (const p of validInvitedParticipants) {
            await (await import('@/lib/db/queries')).logActivityEvent({
              workspaceId: workspace.id,
              challengeId: id,
              userId: p.id,
              actorUserId: user.dbUser.id,
              type: 'INVITE_SENT' as any,
              metadata: { method: 'admin_update' }
            })
          }
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

          // Log ENROLLED for new enrollments
          for (const p of validEnrolledParticipants) {
            await (await import('@/lib/db/queries')).logActivityEvent({
              workspaceId: workspace.id,
              challengeId: id,
              userId: p.id,
              actorUserId: user.dbUser.id,
              type: 'ENROLLED' as any,
              metadata: { method: 'admin_update' }
            })
          }
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

          for (const p of validParticipants) {
            await (await import('@/lib/db/queries')).logActivityEvent({
              workspaceId: workspace.id,
              challengeId: id,
              userId: p.id,
              actorUserId: user.dbUser.id,
              type: 'INVITE_SENT' as any,
              metadata: { method: 'admin_update_legacy' }
            })
          }
        }
      }

      // Log UNENROLLED for users removed by this update
      for (const [userId, prev] of prevByUserId) {
        if (!targetAll.has(userId)) {
          await (await import('@/lib/db/queries')).logActivityEvent({
            workspaceId: workspace.id,
            challengeId: id,
            userId,
            actorUserId: user.dbUser.id,
            type: 'UNENROLLED' as any,
            metadata: { reason: 'removed_by_admin' }
          })
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

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);
  const { action } = await request.json();

  if (!action || !['PUBLISH', 'UNPUBLISH', 'ARCHIVE'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const challenge = await prisma.challenge.findFirst({
    where: { id, workspaceId: workspace.id }
  });

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  let nextStatus: import('@/lib/auth/types').ChallengeStatus = challenge.status as any;
  if (action === 'PUBLISH') nextStatus = 'PUBLISHED';
  if (action === 'UNPUBLISH') nextStatus = 'DRAFT';
  if (action === 'ARCHIVE') nextStatus = 'ARCHIVED';

  const updated = await prisma.challenge.update({
    where: { id },
    data: { status: nextStatus }
  });

  // Log event
  await logActivityEvent({
    workspaceId: workspace.id,
    challengeId: id,
    actorUserId: user.dbUser.id,
    type: action === 'PUBLISH' ? 'CHALLENGE_PUBLISHED' : action === 'UNPUBLISH' ? 'CHALLENGE_UNPUBLISHED' : 'CHALLENGE_ARCHIVED'
  })

  // On publish: best-effort send invite emails to users with INVITED status for this challenge
  if (action === 'PUBLISH') {
    try {
      const memberships = await prisma.enrollment.findMany({
        where: { challengeId: id, status: 'INVITED' },
        include: { user: true }
      })
      if (memberships.length > 0) {
        const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
        const host = request.headers.get('host') || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
        const baseUrl = `${proto}://${host}`
        const inviteUrlBase = `${baseUrl}/invite/`
        for (const m of memberships) {
          try {
            // Generate a targeted, single-use invite code for this participant and challenge
            const { createInviteCode } = await import('@/lib/db/queries')
            const invite = await createInviteCode({ challengeId: id, role: m.user.role as any, maxUses: 1, targetEmail: m.user.email }, workspace.id, user.dbUser.id)
            const html = (await import('@/lib/email/templates/invite')).renderInviteEmail({
              workspaceName: workspace.name,
              inviterEmail: user.dbUser.email,
              role: m.user.role,
              inviteUrl: `${inviteUrlBase}${invite.code}`,
              expiresAt: invite.expiresAt,
              challengeTitle: (updated as any).title || null
            })
            await (await import('@/lib/email/smtp')).sendInviteEmail({ to: m.user.email, subject: `You're invited to join ${workspace.name}`, html })
            await logActivityEvent({
              workspaceId: workspace.id,
              challengeId: id,
              actorUserId: user.dbUser.id,
              userId: m.user.id,
              type: 'INVITE_SENT' as any,
              metadata: { via: 'publish', inviteCode: invite.code }
            })
          } catch (e) {
            console.error('Failed sending invite on publish for', m.user.email, e)
          }
        }
      }
    } catch (e) {
      console.error('Publish post-action failed (invite emails):', e)
    }
  }

  return NextResponse.json({ challenge: updated });
});