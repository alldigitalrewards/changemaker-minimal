/**
 * Row-Level Security (RLS) Policy Tests
 *
 * These tests verify that database-level authorization is enforced correctly
 * for all access patterns using Supabase client with proper authentication contexts.
 * RLS provides defense-in-depth security beyond application-level middleware.
 *
 * Test Categories:
 * - Workspace Isolation (cross-tenant data access prevention)
 * - Manager Assignment Access (managers only see assigned challenges)
 * - Role-Based Access (ADMIN, MANAGER, PARTICIPANT permissions)
 * - ActivitySubmission Multi-Role Policy (participant/manager/admin access)
 * - Service Role Bypass (system operations)
 * - Edge Cases (deleted memberships, invalid contexts)
 * - Performance Verification (RLS query performance)
 */

import { test, expect } from '@playwright/test';
import { TEST_WORKSPACES, createTestWorkspaces, cleanupTestData } from '../fixtures/rls-test-data';
import {
  createServiceRoleClient,
  createAuthenticatedClient,
  clearAuthSession,
} from '../utils/supabase-auth-test';

test.describe('RLS Policy Tests', () => {
  test.beforeAll(async () => {
    // Create test workspaces with Supabase service role client
    const serviceClient = createServiceRoleClient();
    await createTestWorkspaces(serviceClient);
  });

  test.afterAll(async () => {
    // Cleanup test data
    const serviceClient = createServiceRoleClient();
    await cleanupTestData(serviceClient);
  });

  // =================================================================
  // CATEGORY 1: WORKSPACE ISOLATION TESTS
  // =================================================================
  test.describe('Workspace Isolation', () => {
    test('admin1 can see own workspace but not workspace2', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.admin);

      // Query all workspaces - should only see workspace1 due to RLS
      const { data: workspaces, error } = await client.from('Workspace').select('*');

      expect(error).toBeNull();
      expect(workspaces).toBeDefined();
      expect(workspaces?.length).toBe(1);
      expect(workspaces?.[0].id).toBe(TEST_WORKSPACES.workspace1.id);

      await clearAuthSession(client);
    });

    test('participant1 cannot see cross-workspace challenges', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.participant);

      // Query challenges - should only see workspace1 challenges
      const { data: challenges, error } = await client.from('Challenge').select('*');

      expect(error).toBeNull();
      expect(challenges).toBeDefined();
      expect(challenges?.length).toBe(1);
      expect(challenges?.[0].workspaceId).toBe(TEST_WORKSPACES.workspace1.id);

      await clearAuthSession(client);
    });

    test('users can only see users in same workspace', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.admin);

      // Query workspace memberships - should only see workspace1 members
      const { data: memberships, error } = await client
        .from('WorkspaceMembership')
        .select('*, User(*)');

      expect(error).toBeNull();
      expect(memberships).toBeDefined();

      // Should see 4 members in workspace1 (admin, manager, participant, otherParticipant)
      expect(memberships?.length).toBe(4);

      // All memberships should be for workspace1
      memberships?.forEach((membership) => {
        expect(membership.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);
      });

      await clearAuthSession(client);
    });
  });

  // =================================================================
  // CATEGORY 2: MANAGER ASSIGNMENT-BASED ACCESS TESTS
  // =================================================================
  test.describe('Manager Assignment-Based Access', () => {
    test('manager1 can see submissions for assigned challenge', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.manager);

      // Query submissions - should only see those for assigned challenges
      const { data: submissions, error } = await client
        .from('ActivitySubmission')
        .select('*, Activity(*)')
        .eq('activityId', TEST_WORKSPACES.workspace1.assignedActivity.id);

      expect(error).toBeNull();
      expect(submissions).toBeDefined();
      expect(submissions?.length).toBeGreaterThan(0);

      await clearAuthSession(client);
    });

    test('manager1 cannot see submissions for unassigned challenge', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.manager);

      // Query submissions for unassigned activity - should return empty
      const { data: submissions, error } = await client
        .from('ActivitySubmission')
        .select('*')
        .eq('activityId', TEST_WORKSPACES.workspace1.unassignedActivity.id);

      expect(error).toBeNull();
      expect(submissions).toBeDefined();
      expect(submissions?.length).toBe(0);

      await clearAuthSession(client);
    });

    test('manager1 cannot see cross-workspace submissions', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.manager);

      // Query submissions for workspace2 - should return empty
      const { data: submissions, error } = await client
        .from('ActivitySubmission')
        .select('*')
        .eq('activityId', TEST_WORKSPACES.workspace2.assignedActivity.id);

      expect(error).toBeNull();
      expect(submissions).toBeDefined();
      expect(submissions?.length).toBe(0);

      await clearAuthSession(client);
    });

    test('manager1 can see their challenge assignments', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.manager);

      // Query assignments
      const { data: assignments, error } = await client.from('ChallengeAssignment').select('*');

      expect(error).toBeNull();
      expect(assignments).toBeDefined();
      expect(assignments?.length).toBe(1);
      expect(assignments?.[0].managerId).toBe(TEST_WORKSPACES.workspace1.users.manager.id);

      await clearAuthSession(client);
    });

    test('manager1 cannot see other manager assignments', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.manager);

      // Query workspace2 manager assignments - should return empty
      const { data: assignments, error } = await client
        .from('ChallengeAssignment')
        .select('*')
        .eq('workspaceId', TEST_WORKSPACES.workspace2.id);

      expect(error).toBeNull();
      expect(assignments).toBeDefined();
      expect(assignments?.length).toBe(0);

      await clearAuthSession(client);
    });
  });

  // =================================================================
  // CATEGORY 3: ROLE-BASED ACCESS CONTROL TESTS
  // =================================================================
  test.describe('Role-Based Access Control', () => {
    test('admin can see all workspace submissions', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.admin);

      // Query all submissions in workspace
      const { data: submissions, error } = await client
        .from('ActivitySubmission')
        .select('*, Activity(*, Challenge(*))');

      expect(error).toBeNull();
      expect(submissions).toBeDefined();

      // Should see all submissions in workspace1
      submissions?.forEach((submission) => {
        expect(submission.Activity.Challenge.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);
      });

      await clearAuthSession(client);
    });

    test('participant can only see own submissions', async () => {
      const client = await createAuthenticatedClient(
        TEST_WORKSPACES.workspace1.users.participant
      );

      // Query submissions
      const { data: submissions, error } = await client.from('ActivitySubmission').select('*');

      expect(error).toBeNull();
      expect(submissions).toBeDefined();

      // Should only see own submissions
      submissions?.forEach((submission) => {
        expect(submission.userId).toBe(TEST_WORKSPACES.workspace1.users.participant.id);
      });

      await clearAuthSession(client);
    });

    test('participant cannot see other participant submissions', async () => {
      const client = await createAuthenticatedClient(
        TEST_WORKSPACES.workspace1.users.participant
      );

      // Query submissions for other participant - should return empty
      const { data: submissions, error } = await client
        .from('ActivitySubmission')
        .select('*')
        .eq('userId', TEST_WORKSPACES.workspace1.users.otherParticipant.id);

      expect(error).toBeNull();
      expect(submissions).toBeDefined();
      expect(submissions?.length).toBe(0);

      await clearAuthSession(client);
    });

    test('only admin can create challenge assignments', async () => {
      const managerClient = await createAuthenticatedClient(
        TEST_WORKSPACES.workspace1.users.manager
      );

      // Manager tries to create assignment - should fail
      const { data: assignment, error: managerError } = await managerClient
        .from('ChallengeAssignment')
        .insert({
          managerId: TEST_WORKSPACES.workspace1.users.manager.id,
          challengeId: TEST_WORKSPACES.workspace1.challenge.id,
          workspaceId: TEST_WORKSPACES.workspace1.id,
        })
        .select()
        .single();

      expect(managerError).not.toBeNull();
      expect(assignment).toBeNull();

      await clearAuthSession(managerClient);

      // Admin can create assignment
      const adminClient = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.admin);

      const { data: adminAssignment, error: adminError } = await adminClient
        .from('ChallengeAssignment')
        .insert({
          managerId: TEST_WORKSPACES.workspace1.users.manager.id,
          challengeId: TEST_WORKSPACES.workspace1.challenge.id,
          workspaceId: TEST_WORKSPACES.workspace1.id,
        })
        .select()
        .single();

      // Cleanup the test assignment if it was created
      if (adminAssignment) {
        await adminClient.from('ChallengeAssignment').delete().eq('id', adminAssignment.id);
      }

      expect(adminError).toBeNull();
      expect(adminAssignment).not.toBeNull();

      await clearAuthSession(adminClient);
    });

    test('only admin can delete challenge assignments', async () => {
      const serviceClient = createServiceRoleClient();

      // Create temporary assignment for deletion test
      const { data: tempAssignment } = await serviceClient
        .from('ChallengeAssignment')
        .insert({
          managerId: TEST_WORKSPACES.workspace1.users.manager.id,
          challengeId: TEST_WORKSPACES.workspace1.challenge.id,
          workspaceId: TEST_WORKSPACES.workspace1.id,
        })
        .select()
        .single();

      if (!tempAssignment) {
        throw new Error('Failed to create temporary assignment for test');
      }

      // Manager tries to delete assignment - should fail
      const managerClient = await createAuthenticatedClient(
        TEST_WORKSPACES.workspace1.users.manager
      );

      const { error: managerError } = await managerClient
        .from('ChallengeAssignment')
        .delete()
        .eq('id', tempAssignment.id);

      expect(managerError).not.toBeNull();

      await clearAuthSession(managerClient);

      // Admin can delete assignment
      const adminClient = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.admin);

      const { error: adminError } = await adminClient
        .from('ChallengeAssignment')
        .delete()
        .eq('id', tempAssignment.id);

      expect(adminError).toBeNull();

      await clearAuthSession(adminClient);
    });
  });

  // =================================================================
  // CATEGORY 4: ACTIVITYSUBMISSION MULTI-ROLE POLICY TESTS
  // =================================================================
  test.describe('ActivitySubmission Multi-Role Policy', () => {
    test('participant can create own submission', async () => {
      const client = await createAuthenticatedClient(
        TEST_WORKSPACES.workspace1.users.participant
      );

      // Create submission
      const { data: submission, error } = await client
        .from('ActivitySubmission')
        .insert({
          userId: TEST_WORKSPACES.workspace1.users.participant.id,
          activityId: TEST_WORKSPACES.workspace1.assignedActivity.id,
          status: 'PENDING',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(submission).not.toBeNull();

      // Cleanup
      if (submission) {
        await client.from('ActivitySubmission').delete().eq('id', submission.id);
      }

      await clearAuthSession(client);
    });

    test('manager can update submission for assigned challenge', async () => {
      const serviceClient = createServiceRoleClient();

      // Create temporary submission
      const { data: tempSubmission } = await serviceClient
        .from('ActivitySubmission')
        .insert({
          userId: TEST_WORKSPACES.workspace1.users.participant.id,
          activityId: TEST_WORKSPACES.workspace1.assignedActivity.id,
          status: 'PENDING',
        })
        .select()
        .single();

      if (!tempSubmission) {
        throw new Error('Failed to create temporary submission for test');
      }

      // Manager updates submission
      const managerClient = await createAuthenticatedClient(
        TEST_WORKSPACES.workspace1.users.manager
      );

      const { data: updated, error } = await managerClient
        .from('ActivitySubmission')
        .update({ status: 'REVIEWED' })
        .eq('id', tempSubmission.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated?.status).toBe('REVIEWED');

      await clearAuthSession(managerClient);

      // Cleanup
      await serviceClient.from('ActivitySubmission').delete().eq('id', tempSubmission.id);
    });

    test('admin can update any submission in workspace', async () => {
      const serviceClient = createServiceRoleClient();

      // Create temporary submission
      const { data: tempSubmission } = await serviceClient
        .from('ActivitySubmission')
        .insert({
          userId: TEST_WORKSPACES.workspace1.users.participant.id,
          activityId: TEST_WORKSPACES.workspace1.assignedActivity.id,
          status: 'PENDING',
        })
        .select()
        .single();

      if (!tempSubmission) {
        throw new Error('Failed to create temporary submission for test');
      }

      // Admin updates submission
      const adminClient = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.admin);

      const { data: updated, error } = await adminClient
        .from('ActivitySubmission')
        .update({ status: 'APPROVED' })
        .eq('id', tempSubmission.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated?.status).toBe('APPROVED');

      await clearAuthSession(adminClient);

      // Cleanup
      await serviceClient.from('ActivitySubmission').delete().eq('id', tempSubmission.id);
    });
  });

  // =================================================================
  // CATEGORY 5: SERVICE ROLE BYPASS TESTS
  // =================================================================
  test.describe('Service Role Bypass', () => {
    test('service role can access all data', async () => {
      const serviceClient = createServiceRoleClient();

      // Service role should see all workspaces
      const { data: workspaces, error } = await serviceClient.from('Workspace').select('*');

      expect(error).toBeNull();
      expect(workspaces).toBeDefined();
      expect(workspaces?.length).toBeGreaterThanOrEqual(2); // Both test workspaces
    });
  });

  // =================================================================
  // CATEGORY 6: EDGE CASES
  // =================================================================
  test.describe('Edge Cases', () => {
    test('user with no workspace membership sees nothing', async () => {
      const serviceClient = createServiceRoleClient();

      // Create user without workspace membership
      const { data: authUser } = await serviceClient.auth.admin.createUser({
        email: 'no-workspace@test.com',
        password: 'test-password',
        email_confirm: true,
      });

      if (!authUser.user) {
        throw new Error('Failed to create test user');
      }

      const { data: noWorkspaceUser } = await serviceClient
        .from('User')
        .insert({
          email: 'no-workspace@test.com',
          supabaseUserId: authUser.user.id,
        })
        .select()
        .single();

      if (!noWorkspaceUser) {
        throw new Error('Failed to create User record');
      }

      // Create authenticated client for user with no workspace
      const client = await createAuthenticatedClient({
        id: noWorkspaceUser.id,
        email: noWorkspaceUser.email,
        supabaseUserId: authUser.user.id,
        role: 'PARTICIPANT',
      });

      // Query challenges - should return empty
      const { data: challenges, error } = await client.from('Challenge').select('*');

      expect(error).toBeNull();
      expect(challenges).toBeDefined();
      expect(challenges?.length).toBe(0);

      await clearAuthSession(client);

      // Cleanup
      await serviceClient.from('User').delete().eq('id', noWorkspaceUser.id);
      await serviceClient.auth.admin.deleteUser(authUser.user.id);
    });

    test('deleted workspace membership revokes access', async () => {
      const serviceClient = createServiceRoleClient();

      // Delete participant's workspace membership
      await serviceClient
        .from('WorkspaceMembership')
        .delete()
        .eq('userId', TEST_WORKSPACES.workspace1.users.participant.id);

      // Try to query challenges
      const client = await createAuthenticatedClient(
        TEST_WORKSPACES.workspace1.users.participant
      );

      const { data: challenges, error } = await client.from('Challenge').select('*');

      expect(error).toBeNull();
      expect(challenges).toBeDefined();
      expect(challenges?.length).toBe(0);

      await clearAuthSession(client);

      // Restore membership
      await serviceClient.from('WorkspaceMembership').insert({
        userId: TEST_WORKSPACES.workspace1.users.participant.id,
        workspaceId: TEST_WORKSPACES.workspace1.id,
        role: 'PARTICIPANT',
      });
    });

    test('manager with deleted assignment loses access', async () => {
      const serviceClient = createServiceRoleClient();

      // Delete manager's assignment
      await serviceClient
        .from('ChallengeAssignment')
        .delete()
        .eq('managerId', TEST_WORKSPACES.workspace1.users.manager.id);

      // Try to query submissions
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.manager);

      const { data: submissions, error } = await client
        .from('ActivitySubmission')
        .select('*')
        .eq('activityId', TEST_WORKSPACES.workspace1.assignedActivity.id);

      expect(error).toBeNull();
      expect(submissions).toBeDefined();
      expect(submissions?.length).toBe(0);

      await clearAuthSession(client);

      // Restore assignment
      await serviceClient.from('ChallengeAssignment').insert({
        managerId: TEST_WORKSPACES.workspace1.users.manager.id,
        challengeId: TEST_WORKSPACES.workspace1.challenge.id,
        workspaceId: TEST_WORKSPACES.workspace1.id,
      });
    });
  });

  // =================================================================
  // CATEGORY 7: PERFORMANCE VERIFICATION
  // =================================================================
  test.describe('Performance Verification', () => {
    test('RLS policies do not significantly slow queries', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.admin);

      // Measure query time
      const start = Date.now();
      const { data: challenges, error } = await client.from('Challenge').select('*');
      const duration = Date.now() - start;

      expect(error).toBeNull();
      expect(challenges).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete in <2s

      await clearAuthSession(client);
    });

    test('manager queue query performs well with RLS', async () => {
      const client = await createAuthenticatedClient(TEST_WORKSPACES.workspace1.users.manager);

      // Measure complex manager query time
      const start = Date.now();
      const { data: submissions, error } = await client
        .from('ActivitySubmission')
        .select('*, Activity(*, Challenge(*))');
      const duration = Date.now() - start;

      expect(error).toBeNull();
      expect(submissions).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete in <2s

      await clearAuthSession(client);
    });
  });
});
