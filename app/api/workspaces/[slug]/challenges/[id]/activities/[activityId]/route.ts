import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/db';

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; activityId: string }> }
) => {
  const { slug, id: challengeId, activityId } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);
  
  const body = await request.json();
  const { pointsValue, maxSubmissions, deadline, isRequired } = body;

  // Verify activity exists and belongs to this challenge
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      challengeId,
      challenge: { workspaceId: workspace.id }
    }
  });

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  const updatedActivity = await prisma.activity.update({
    where: { id: activityId },
    data: {
      pointsValue: pointsValue ?? activity.pointsValue,
      maxSubmissions: maxSubmissions ?? activity.maxSubmissions,
      deadline: deadline ? new Date(deadline) : activity.deadline,
      isRequired: isRequired ?? activity.isRequired
    },
    include: { template: true }
  });

  return NextResponse.json({ activity: updatedActivity });
});

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; activityId: string }> }
) => {
  const { slug, id: challengeId, activityId } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);

  // Verify activity exists and belongs to this challenge
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      challengeId,
      challenge: { workspaceId: workspace.id }
    }
  });

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  await prisma.activity.delete({
    where: { id: activityId }
  });

  return NextResponse.json({ success: true });
});