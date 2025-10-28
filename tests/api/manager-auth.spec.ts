import { test, expect } from '@playwright/test';
import { createServiceClient } from '../helpers/supabase-client';
import { loginAs, loginAsAdmin, loginAsManager, loginAsParticipant, logout } from '../helpers/auth-context';
import { randomUUID } from 'crypto';

/**
 * Manager Authorization Tests (Task 27)
 *
 * Tests authorization rules for manager endpoints using Supabase client operations:
 * - Manager can only access assigned challenge submissions (via RLS)
 * - Manager cannot access unassigned challenge submissions (RLS blocks)
 * - PARTICIPANT cannot access manager data (RLS blocks)
 * - ADMIN has full access to manager data (RLS allows)
 * - Cross-workspace assignment validation
 * - Edge cases: deleted assignments, inactive users
 *
 * This test suite uses Supabase clients with JWT auth context to verify
 * that RLS policies correctly enforce authorization at the database level.
 */

test.describe.configure({ mode: 'serial' });

test.describe('Manager Authorization Tests', () => {
  const WORKSPACE_SLUG = 'alldigitalrewards';
  const MANAGER_EMAIL = 'tom.manager@alldigitalrewards.com';
  const PARTICIPANT_EMAIL = 'sarah.jones@alldigitalrewards.com';
  const ADMIN_EMAIL = 'jfelke@alldigitalrewards.com';

  let workspaceId: string;
  let managerId: string;
  let participantId: string;
  let adminId: string;
  let assignedChallengeId: string;
  let unassignedChallengeId: string;
  let assignedActivityId: string;
  let unassignedActivityId: string;
  let enrollmentId: string;
  let assignedSubmissionId: string;

  test.beforeAll(async () => {
    const serviceClient = createServiceClient();

    // Get workspace
    const { data: workspace } = await serviceClient
      .from('Workspace')
      .select('id')
      .eq('slug', WORKSPACE_SLUG)
      .single();
    workspaceId = workspace!.id;

    // Get users
    const { data: manager } = await serviceClient
      .from('User')
      .select('id')
      .eq('email', MANAGER_EMAIL)
      .single();
    managerId = manager!.id;

    const { data: participant } = await serviceClient
      .from('User')
      .select('id')
      .eq('email', PARTICIPANT_EMAIL)
      .single();
    participantId = participant!.id;

    const { data: admin } = await serviceClient
      .from('User')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .single();
    adminId = admin!.id;

    // Create two challenges: one assigned to manager, one not
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    assignedChallengeId = randomUUID();
    await serviceClient.from('Challenge').insert({
      id: assignedChallengeId,
      title: `Manager Auth Test - Assigned ${Date.now()}`,
      description: 'Test challenge assigned to manager',
      workspaceId,
      startDate: now.toISOString(),
      endDate: futureDate.toISOString(),
      status: 'PUBLISHED'
    });

    unassignedChallengeId = randomUUID();
    await serviceClient.from('Challenge').insert({
      id: unassignedChallengeId,
      title: `Manager Auth Test - Unassigned ${Date.now()}`,
      description: 'Test challenge NOT assigned to manager',
      workspaceId,
      startDate: now.toISOString(),
      endDate: futureDate.toISOString(),
      status: 'PUBLISHED'
    });

    // Assign manager to first challenge
    await serviceClient.from('ChallengeAssignment').insert({
      challengeId: assignedChallengeId,
      managerId,
      workspaceId,
      assignedBy: adminId
    });

    // Create activity template
    const { data: activityTemplate } = await serviceClient
      .from('ActivityTemplate')
      .insert({
        id: randomUUID(),
        name: 'Manager Auth Test Activity',
        description: 'Test activity',
        type: 'TEXT_SUBMISSION',
        basePoints: 100,
        workspaceId
      })
      .select()
      .single();

    // Create activities for both challenges
    const { data: assignedActivity } = await serviceClient
      .from('Activity')
      .insert({
        id: randomUUID(),
        challengeId: assignedChallengeId,
        templateId: activityTemplate!.id,
        pointsValue: 100,
        position: 0
      })
      .select()
      .single();
    assignedActivityId = assignedActivity!.id;

    const { data: unassignedActivity } = await serviceClient
      .from('Activity')
      .insert({
        id: randomUUID(),
        challengeId: unassignedChallengeId,
        templateId: activityTemplate!.id,
        pointsValue: 100,
        position: 0
      })
      .select()
      .single();
    unassignedActivityId = unassignedActivity!.id;

    // Create enrollment for participant in assigned challenge
    const { data: enrollment } = await serviceClient
      .from('Enrollment')
      .insert({
        userId: participantId,
        challengeId: assignedChallengeId,
        status: 'ENROLLED'
      })
      .select()
      .single();
    enrollmentId = enrollment!.id;

    // Create submission for assigned challenge
    const { data: submission } = await serviceClient
      .from('ActivitySubmission')
      .insert({
        id: randomUUID(),
        activityId: assignedActivityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission content',
        status: 'PENDING'
      })
      .select()
      .single();
    assignedSubmissionId = submission!.id;
  });

  test.afterAll(async () => {
    const serviceClient = createServiceClient();

    // Cleanup in reverse order of creation
    await serviceClient
      .from('ActivitySubmission')
      .delete()
      .in('activityId', [assignedActivityId, unassignedActivityId]);

    await serviceClient
      .from('Activity')
      .delete()
      .in('id', [assignedActivityId, unassignedActivityId]);

    await serviceClient
      .from('ActivityTemplate')
      .delete()
      .eq('name', 'Manager Auth Test Activity');

    await serviceClient
      .from('ChallengeAssignment')
      .delete()
      .eq('challengeId', assignedChallengeId);

    await serviceClient
      .from('Enrollment')
      .delete()
      .eq('challengeId', assignedChallengeId);

    await serviceClient
      .from('Challenge')
      .delete()
      .in('id', [assignedChallengeId, unassignedChallengeId]);
  });

  test('Manager can access assigned challenge submissions via RLS', async () => {
    const authSession = await loginAs(MANAGER_EMAIL);

    // Query specific submission by ID - RLS will allow if assigned, block if not
    const { data: submission, error } = await authSession.client
      .from('ActivitySubmission')
      .select('id, activityId, userId, status')
      .eq('id', assignedSubmissionId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(submission).toBeDefined();
    expect(submission?.id).toBe(assignedSubmissionId);
    expect(submission?.activityId).toBe(assignedActivityId);

    await logout(authSession);
  });

  test('Manager can only see submissions for assigned challenges (RLS filter)', async () => {
    const authSession = await loginAs(MANAGER_EMAIL);
    const serviceClient = createServiceClient();

    // Query all submissions - RLS should filter to only assigned challenges
    const { data: submissions, error } = await authSession.client
      .from('ActivitySubmission')
      .select('*');

    expect(error).toBeNull();
    expect(submissions).toBeDefined();

    // Get the activity info to verify challenge associations
    const activityIds = submissions?.map(s => s.activityId) || [];
    const { data: activities } = await serviceClient
      .from('Activity')
      .select('id, challengeId')
      .in('id', activityIds);

    const activityMap = new Map(activities?.map(a => [a.id, a.challengeId]));

    // All submissions should be for assigned challenges
    const hasAssignedSubmissions = submissions?.some(
      s => activityMap.get(s.activityId) === assignedChallengeId
    );
    expect(hasAssignedSubmissions).toBe(true);

    // Should NOT see submissions for unassigned challenges
    const hasUnassignedSubmissions = submissions?.some(
      s => activityMap.get(s.activityId) === unassignedChallengeId
    );
    expect(hasUnassignedSubmissions).toBe(false);

    await logout(authSession);
  });

  test('Manager cannot access unassigned challenge submissions (RLS blocks)', async () => {
    const serviceClient = createServiceClient();
    const authSession = await loginAs(MANAGER_EMAIL);

    // Create a submission for unassigned challenge (using service client)
    const { data: unassignedEnrollment } = await serviceClient
      .from('Enrollment')
      .insert({
        userId: participantId,
        challengeId: unassignedChallengeId,
        status: 'ENROLLED'
      })
      .select()
      .single();

    const { data: unassignedSubmission } = await serviceClient
      .from('ActivitySubmission')
      .insert({
        id: randomUUID(),
        activityId: unassignedActivityId,
        userId: participantId,
        enrollmentId: unassignedEnrollment!.id,
        textContent: 'Unassigned submission',
        status: 'PENDING'
      })
      .select()
      .single();

    // Try to query this submission as manager - RLS should block it
    const { data: result, error } = await authSession.client
      .from('ActivitySubmission')
      .select('*')
      .eq('id', unassignedSubmission!.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(result).toBeNull(); // RLS blocks access

    // Cleanup
    await serviceClient
      .from('ActivitySubmission')
      .delete()
      .eq('id', unassignedSubmission!.id);

    await serviceClient
      .from('Enrollment')
      .delete()
      .eq('id', unassignedEnrollment!.id);

    await logout(authSession);
  });

  test('Manager cannot update unassigned challenge submissions (RLS blocks)', async () => {
    const serviceClient = createServiceClient();
    const authSession = await loginAs(MANAGER_EMAIL);

    // Create a submission for unassigned challenge
    const { data: unassignedEnrollment } = await serviceClient
      .from('Enrollment')
      .insert({
        userId: participantId,
        challengeId: unassignedChallengeId,
        status: 'ENROLLED'
      })
      .select()
      .single();

    const { data: unassignedSubmission } = await serviceClient
      .from('ActivitySubmission')
      .insert({
        id: randomUUID(),
        activityId: unassignedActivityId,
        userId: participantId,
        enrollmentId: unassignedEnrollment!.id,
        textContent: 'Unassigned submission',
        status: 'PENDING'
      })
      .select()
      .single();

    // Try to update this submission as manager - RLS should block it
    const { error } = await authSession.client
      .from('ActivitySubmission')
      .update({
        status: 'MANAGER_APPROVED',
        managerNotes: 'Trying to approve unassigned'
      })
      .eq('id', unassignedSubmission!.id);

    // RLS blocks the update - no rows affected, but no error thrown
    expect(error).toBeNull();

    // Verify submission was NOT updated
    const { data: check } = await serviceClient
      .from('ActivitySubmission')
      .select('status, managerNotes')
      .eq('id', unassignedSubmission!.id)
      .single();

    expect(check!.status).toBe('PENDING');
    expect(check!.managerNotes).toBeNull();

    // Cleanup
    await serviceClient
      .from('ActivitySubmission')
      .delete()
      .eq('id', unassignedSubmission!.id);

    await serviceClient
      .from('Enrollment')
      .delete()
      .eq('id', unassignedEnrollment!.id);

    await logout(authSession);
  });

  test('PARTICIPANT cannot access manager queue data (RLS blocks)', async () => {
    const authSession = await loginAs(PARTICIPANT_EMAIL);

    // Participant tries to query all submissions (manager queue behavior)
    const { data: submissions, error } = await authSession.client
      .from('ActivitySubmission')
      .select('*')
      .neq('userId', participantId); // Try to see OTHER users' submissions

    expect(error).toBeNull();
    // RLS blocks - participant can only see their own submissions
    expect(submissions?.length).toBe(0);

    await logout(authSession);
  });

  test('PARTICIPANT cannot access ChallengeAssignment table (RLS blocks)', async () => {
    const authSession = await loginAs(PARTICIPANT_EMAIL);

    // Participant tries to query challenge assignments
    const { data: assignments, error } = await authSession.client
      .from('ChallengeAssignment')
      .select('*');

    expect(error).toBeNull();
    // RLS blocks participant from seeing any assignments
    expect(assignments?.length).toBe(0);

    await logout(authSession);
  });

  test('ADMIN can access all submissions in workspace (RLS allows)', async () => {
    const authSession = await loginAsAdmin(WORKSPACE_SLUG);
    const serviceClient = createServiceClient();

    // Admin queries all submissions
    const { data: submissions, error } = await authSession.client
      .from('ActivitySubmission')
      .select('*');

    expect(error).toBeNull();
    expect(submissions).toBeDefined();

    // Get the activity and challenge info to verify workspace associations
    const activityIds = submissions?.map(s => s.activityId) || [];
    const { data: activities } = await serviceClient
      .from('Activity')
      .select('id, challengeId')
      .in('id', activityIds);

    const challengeIds = [...new Set(activities?.map(a => a.challengeId))];
    const { data: challenges } = await serviceClient
      .from('Challenge')
      .select('id, workspaceId')
      .in('id', challengeIds)
      .eq('workspaceId', workspaceId);

    // Admin should see submissions for challenges in their workspace
    const workspaceChallengeIds = new Set(challenges?.map(c => c.id));
    expect(workspaceChallengeIds.has(assignedChallengeId)).toBe(true);

    await logout(authSession);
  });

  test('ADMIN can access all ChallengeAssignments in workspace (RLS allows)', async () => {
    const authSession = await loginAsAdmin(WORKSPACE_SLUG);

    // Admin queries all challenge assignments
    const { data: assignments, error } = await authSession.client
      .from('ChallengeAssignment')
      .select('*')
      .eq('workspaceId', workspaceId);

    expect(error).toBeNull();
    expect(assignments).toBeDefined();
    expect(assignments!.length).toBeGreaterThan(0);

    // Should see the assignment to the manager
    const managerAssignment = assignments?.find(a => a.managerId === managerId);
    expect(managerAssignment).toBeDefined();

    await logout(authSession);
  });

  test('Edge case: deleted assignment blocks manager access', async () => {
    const serviceClient = createServiceClient();
    const authSession = await loginAs(MANAGER_EMAIL);

    // Delete the manager's assignment
    await serviceClient
      .from('ChallengeAssignment')
      .delete()
      .eq('challengeId', assignedChallengeId)
      .eq('managerId', managerId);

    // Try to access previously assigned submissions
    const { data: submissions, error } = await authSession.client
      .from('ActivitySubmission')
      .select('*')
      .eq('activityId', assignedActivityId);

    expect(error).toBeNull();
    // RLS blocks access after assignment deleted
    expect(submissions?.length).toBe(0);

    // Restore assignment for other tests
    await serviceClient.from('ChallengeAssignment').insert({
      challengeId: assignedChallengeId,
      managerId,
      workspaceId,
      assignedBy: adminId
    });

    await logout(authSession);
  });

  test('Cross-workspace isolation: manager cannot see other workspace assignments', async () => {
    const serviceClient = createServiceClient();
    const authSession = await loginAs(MANAGER_EMAIL);

    // Get another workspace (if exists)
    const { data: otherWorkspace } = await serviceClient
      .from('Workspace')
      .select('id')
      .neq('slug', WORKSPACE_SLUG)
      .limit(1)
      .maybeSingle();

    if (!otherWorkspace) {
      test.skip();
      return;
    }

    // Query assignments - should only see current workspace
    const { data: assignments, error } = await authSession.client
      .from('ChallengeAssignment')
      .select('*')
      .eq('workspaceId', otherWorkspace.id);

    expect(error).toBeNull();
    expect(assignments?.length).toBe(0);

    await logout(authSession);
  });
});
