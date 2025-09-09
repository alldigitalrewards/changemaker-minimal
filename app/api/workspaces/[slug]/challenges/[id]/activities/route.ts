import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth';
import { getChallengeActivities, createActivity, getActivityTemplate } from '@/lib/db/queries';
import { ActivityType } from '@/lib/types';

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);

  const activities = await getChallengeActivities(id, workspace.id);

  return NextResponse.json({ activities });
});

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id: challengeId } = await params;
  const { workspace, user } = await requireWorkspaceAdmin(slug);
  
  const body = await request.json();
  const { templateId, pointsValue, maxSubmissions, deadline, isRequired } = body;

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }

  // Verify template exists in workspace
  const template = await getActivityTemplate(templateId, workspace.id);
  if (!template) {
    return NextResponse.json({ error: 'Activity template not found' }, { status: 404 });
  }

  const activity = await createActivity(
    {
      templateId,
      challengeId,
      pointsValue: pointsValue ?? template.basePoints,
      maxSubmissions: maxSubmissions ?? 1,
      deadline: deadline ? new Date(deadline) : undefined,
      isRequired: isRequired ?? false
    },
    workspace.id
  );

  return NextResponse.json({ activity }, { status: 201 });
});