import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling, requireWorkspaceAdmin } from '@/lib/auth/api-auth'
import { updateActivity, deleteActivity } from '@/lib/db/queries'

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; activityId: string }> }
) => {
  const { slug, activityId } = await params
  const { workspace, user } = await requireWorkspaceAdmin(slug)

  const body = await request.json()
  const { pointsValue, maxSubmissions, deadline, isRequired } = body as Partial<{
    pointsValue: number
    maxSubmissions: number
    deadline: string | null
    isRequired: boolean
  }>

  // Basic server-side validation
  if (pointsValue !== undefined && (typeof pointsValue !== 'number' || pointsValue < 1)) {
    return NextResponse.json({ error: 'pointsValue must be a positive number' }, { status: 400 })
  }
  if (maxSubmissions !== undefined && (typeof maxSubmissions !== 'number' || maxSubmissions < 1)) {
    return NextResponse.json({ error: 'maxSubmissions must be at least 1' }, { status: 400 })
  }

  const updated = await updateActivity(
    activityId,
    workspace.id,
    {
      pointsValue,
      maxSubmissions,
      deadline: deadline === undefined ? undefined : (deadline ? new Date(deadline) : null),
      isRequired
    }
  )

  return NextResponse.json({ activity: updated })
})

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; activityId: string }> }
) => {
  const { slug, activityId } = await params
  const { workspace, user } = await requireWorkspaceAdmin(slug)

  await deleteActivity(activityId, workspace.id)
  return NextResponse.json({ success: true })
})

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