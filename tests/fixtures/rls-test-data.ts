/**
 * Test Data Fixtures for RLS Policy Tests
 *
 * This module provides test data setup and cleanup for RLS testing.
 * It creates multiple workspaces with different users and roles to test
 * workspace isolation and role-based access control.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface TestWorkspace {
  id: string;
  slug: string;
  name: string;
  users: {
    admin: TestUser;
    manager: TestUser;
    participant: TestUser;
    otherParticipant: TestUser;
  };
  challenge: TestChallenge;
  assignedActivity: TestActivity;
  unassignedActivity: TestActivity;
  assignedSubmission: TestSubmission;
  assignments: TestAssignment[];
  expiredInvite: TestInvite;
}

export interface TestUser {
  id: string;
  email: string;
  supabaseUserId: string;
  role: 'ADMIN' | 'MANAGER' | 'PARTICIPANT';
}

export interface TestChallenge {
  id: string;
  title: string;
  workspaceId: string;
}

export interface TestActivity {
  id: string;
  title: string;
  challengeId: string;
}

export interface TestSubmission {
  id: string;
  userId: string;
  activityId: string;
  status: string;
}

export interface TestAssignment {
  id: string;
  managerId: string;
  challengeId: string;
  workspaceId: string;
}

export interface TestInvite {
  id: string;
  code: string;
  workspaceId: string;
  expiresAt: Date;
}

export const TEST_WORKSPACES: {
  workspace1: TestWorkspace;
  workspace2: TestWorkspace;
} = {
  workspace1: {
    id: uuidv4(),
    slug: 'test-workspace-1',
    name: 'Test Workspace 1',
    users: {
      admin: {
        id: uuidv4(),
        email: 'admin1@test.com',
        supabaseUserId: uuidv4(),
        role: 'ADMIN',
      },
      manager: {
        id: uuidv4(),
        email: 'manager1@test.com',
        supabaseUserId: uuidv4(),
        role: 'MANAGER',
      },
      participant: {
        id: uuidv4(),
        email: 'participant1@test.com',
        supabaseUserId: uuidv4(),
        role: 'PARTICIPANT',
      },
      otherParticipant: {
        id: uuidv4(),
        email: 'participant2@test.com',
        supabaseUserId: uuidv4(),
        role: 'PARTICIPANT',
      },
    },
    challenge: {
      id: uuidv4(),
      title: 'Test Challenge 1',
      workspaceId: '',
    },
    assignedActivity: {
      id: uuidv4(),
      title: 'Assigned Activity',
      challengeId: '',
    },
    unassignedActivity: {
      id: uuidv4(),
      title: 'Unassigned Activity',
      challengeId: '',
    },
    assignedSubmission: {
      id: uuidv4(),
      userId: '',
      activityId: '',
      status: 'PENDING',
    },
    assignments: [],
    expiredInvite: {
      id: uuidv4(),
      code: 'EXPIRED123',
      workspaceId: '',
      expiresAt: new Date('2020-01-01'),
    },
  },
  workspace2: {
    id: uuidv4(),
    slug: 'test-workspace-2',
    name: 'Test Workspace 2',
    users: {
      admin: {
        id: uuidv4(),
        email: 'admin2@test.com',
        supabaseUserId: uuidv4(),
        role: 'ADMIN',
      },
      manager: {
        id: uuidv4(),
        email: 'manager2@test.com',
        supabaseUserId: uuidv4(),
        role: 'MANAGER',
      },
      participant: {
        id: uuidv4(),
        email: 'participant3@test.com',
        supabaseUserId: uuidv4(),
        role: 'PARTICIPANT',
      },
      otherParticipant: {
        id: uuidv4(),
        email: 'participant4@test.com',
        supabaseUserId: uuidv4(),
        role: 'PARTICIPANT',
      },
    },
    challenge: {
      id: uuidv4(),
      title: 'Test Challenge 2',
      workspaceId: '',
    },
    assignedActivity: {
      id: uuidv4(),
      title: 'Assigned Activity 2',
      challengeId: '',
    },
    unassignedActivity: {
      id: uuidv4(),
      title: 'Unassigned Activity 2',
      challengeId: '',
    },
    assignedSubmission: {
      id: uuidv4(),
      userId: '',
      activityId: '',
      status: 'PENDING',
    },
    assignments: [],
    expiredInvite: {
      id: uuidv4(),
      code: 'EXPIRED456',
      workspaceId: '',
      expiresAt: new Date('2020-01-01'),
    },
  },
};

// Link references
TEST_WORKSPACES.workspace1.challenge.workspaceId = TEST_WORKSPACES.workspace1.id;
TEST_WORKSPACES.workspace1.assignedActivity.challengeId = TEST_WORKSPACES.workspace1.challenge.id;
TEST_WORKSPACES.workspace1.unassignedActivity.challengeId = TEST_WORKSPACES.workspace1.challenge.id;
TEST_WORKSPACES.workspace1.assignedSubmission.userId = TEST_WORKSPACES.workspace1.users.participant.id;
TEST_WORKSPACES.workspace1.assignedSubmission.activityId = TEST_WORKSPACES.workspace1.assignedActivity.id;
TEST_WORKSPACES.workspace1.expiredInvite.workspaceId = TEST_WORKSPACES.workspace1.id;

TEST_WORKSPACES.workspace2.challenge.workspaceId = TEST_WORKSPACES.workspace2.id;
TEST_WORKSPACES.workspace2.assignedActivity.challengeId = TEST_WORKSPACES.workspace2.challenge.id;
TEST_WORKSPACES.workspace2.unassignedActivity.challengeId = TEST_WORKSPACES.workspace2.challenge.id;
TEST_WORKSPACES.workspace2.assignedSubmission.userId = TEST_WORKSPACES.workspace2.users.participant.id;
TEST_WORKSPACES.workspace2.assignedSubmission.activityId = TEST_WORKSPACES.workspace2.assignedActivity.id;
TEST_WORKSPACES.workspace2.expiredInvite.workspaceId = TEST_WORKSPACES.workspace2.id;

/**
 * Create test workspaces and all associated data
 */
export async function createTestWorkspaces(client: SupabaseClient): Promise<void> {
  // Create workspaces
  await client.from('Workspace').insert([
    {
      id: TEST_WORKSPACES.workspace1.id,
      slug: TEST_WORKSPACES.workspace1.slug,
      name: TEST_WORKSPACES.workspace1.name,
    },
    {
      id: TEST_WORKSPACES.workspace2.id,
      slug: TEST_WORKSPACES.workspace2.slug,
      name: TEST_WORKSPACES.workspace2.name,
    },
  ]);

  // Create Supabase auth users and link to User records
  for (const workspace of [TEST_WORKSPACES.workspace1, TEST_WORKSPACES.workspace2]) {
    for (const user of Object.values(workspace.users)) {
      // Create Supabase auth user
      const { data: authUser } = await client.auth.admin.createUser({
        email: user.email,
        password: 'test-password-123',
        email_confirm: true,
      });

      if (authUser.user) {
        user.supabaseUserId = authUser.user.id;

        // Create User record
        await client.from('User').insert({
          id: user.id,
          email: user.email,
          supabaseUserId: authUser.user.id,
        });

        // Create WorkspaceMembership
        await client.from('WorkspaceMembership').insert({
          userId: user.id,
          workspaceId: workspace.id,
          role: user.role,
        });
      }
    }

    // Create challenge
    await client.from('Challenge').insert({
      id: workspace.challenge.id,
      title: workspace.challenge.title,
      description: 'Test challenge description',
      workspaceId: workspace.id,
    });

    // Create activities
    await client.from('Activity').insert([
      {
        id: workspace.assignedActivity.id,
        title: workspace.assignedActivity.title,
        description: 'Assigned activity',
        challengeId: workspace.challenge.id,
        type: 'SUBMISSION',
      },
      {
        id: workspace.unassignedActivity.id,
        title: workspace.unassignedActivity.title,
        description: 'Unassigned activity',
        challengeId: workspace.challenge.id,
        type: 'SUBMISSION',
      },
    ]);

    // Create challenge assignment for manager
    const assignment = {
      id: uuidv4(),
      managerId: workspace.users.manager.id,
      challengeId: workspace.challenge.id,
      workspaceId: workspace.id,
    };
    workspace.assignments.push(assignment);

    await client.from('ChallengeAssignment').insert(assignment);

    // Create activity submission
    await client.from('ActivitySubmission').insert({
      id: workspace.assignedSubmission.id,
      userId: workspace.assignedSubmission.userId,
      activityId: workspace.assignedSubmission.activityId,
      status: workspace.assignedSubmission.status,
    });

    // Create expired invite
    await client.from('InviteCode').insert({
      id: workspace.expiredInvite.id,
      code: workspace.expiredInvite.code,
      workspaceId: workspace.id,
      expiresAt: workspace.expiredInvite.expiresAt.toISOString(),
      maxUses: 10,
      usedCount: 0,
    });
  }
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(client: SupabaseClient): Promise<void> {
  // Delete in reverse order of creation to avoid foreign key constraints
  const workspaceIds = [TEST_WORKSPACES.workspace1.id, TEST_WORKSPACES.workspace2.id];

  // Delete submissions
  await client
    .from('ActivitySubmission')
    .delete()
    .in(
      'activityId',
      [
        TEST_WORKSPACES.workspace1.assignedActivity.id,
        TEST_WORKSPACES.workspace1.unassignedActivity.id,
        TEST_WORKSPACES.workspace2.assignedActivity.id,
        TEST_WORKSPACES.workspace2.unassignedActivity.id,
      ]
    );

  // Delete assignments
  await client.from('ChallengeAssignment').delete().in('workspaceId', workspaceIds);

  // Delete activities
  await client.from('Activity').delete().in(
    'challengeId',
    [TEST_WORKSPACES.workspace1.challenge.id, TEST_WORKSPACES.workspace2.challenge.id]
  );

  // Delete challenges
  await client.from('Challenge').delete().in('workspaceId', workspaceIds);

  // Delete invites
  await client.from('InviteCode').delete().in('workspaceId', workspaceIds);

  // Delete workspace memberships
  await client.from('WorkspaceMembership').delete().in('workspaceId', workspaceIds);

  // Delete users and their Supabase auth accounts
  for (const workspace of [TEST_WORKSPACES.workspace1, TEST_WORKSPACES.workspace2]) {
    for (const user of Object.values(workspace.users)) {
      await client.auth.admin.deleteUser(user.supabaseUserId);
      await client.from('User').delete().eq('id', user.id);
    }
  }

  // Delete workspaces
  await client.from('Workspace').delete().in('id', workspaceIds);
}
