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
  const { pointsValue, maxSubmissions, deadline, isRequired, rewardRules } = body as Partial<{
    pointsValue: number
    maxSubmissions: number
    deadline: string | null
    isRequired: boolean
    rewardRules: any[]
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
      isRequired,
      rewardRules: Array.isArray(rewardRules) ? rewardRules : undefined
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

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; activityId: string }> }
) => {
  const { slug, activityId } = await params;
  const { workspace } = await requireWorkspaceAdmin(slug);

  const body = await request.json();
  const { pointsValue, maxSubmissions, deadline, isRequired } = body as Partial<{
    pointsValue: number
    maxSubmissions: number
    deadline: string | null
    isRequired: boolean
  }>;

  const updated = await updateActivity(
    activityId,
    workspace.id,
    {
      pointsValue,
      maxSubmissions,
      deadline: deadline === undefined ? undefined : (deadline ? new Date(deadline) : null),
      isRequired
    }
  );

  return NextResponse.json({ activity: updated });
});