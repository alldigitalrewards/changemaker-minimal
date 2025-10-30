/**
 * Test Data Fixtures for RLS Policy Tests
 *
 * This module provides test data setup and cleanup for RLS testing.
 * It creates multiple workspaces with different users and roles to test
 * workspace isolation and role-based access control.
 *
 * Note: We use Prisma for database operations and Supabase for auth operations
 * because Prisma bypasses RLS which is necessary for fixture setup.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { DEFAULT_PASSWORD } from '../e2e/support/auth';

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
  unassignedChallenge: TestChallenge; // Separate challenge with no manager assignments
  activityTemplate: TestActivityTemplate;
  assignedActivity: TestActivity;
  unassignedActivity: TestActivity;
  enrollment: TestEnrollment;
  assignedSubmission: TestSubmission;
  assignments: TestAssignment[];
  expiredInvite: TestInvite;
}

export interface TestUser {
  id: string;
  email: string;
  supabaseUserId: string;
  role: 'ADMIN' | 'MANAGER' | 'PARTICIPANT';
  workspaceId?: string;
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
  templateId: string;
}

export interface TestActivityTemplate {
  id: string;
  name: string;
  description: string;
  type: 'TEXT_SUBMISSION' | 'FILE_UPLOAD' | 'PHOTO_UPLOAD' | 'LINK_SUBMISSION' | 'MULTIPLE_CHOICE' | 'VIDEO_SUBMISSION';
  workspaceId: string;
}

export interface TestEnrollment {
  id: string;
  userId: string;
  challengeId: string;
}

export interface TestSubmission {
  id: string;
  userId: string;
  activityId: string;
  enrollmentId: string;
  status: 'PENDING' | 'MANAGER_APPROVED' | 'NEEDS_REVISION' | 'APPROVED' | 'REJECTED';
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
  createdBy: string;
  expiresAt: Date;
}

// Generate unique identifiers for this test run
const TEST_RUN_ID = Date.now();

export const TEST_WORKSPACES: {
  workspace1: TestWorkspace;
  workspace2: TestWorkspace;
} = {
  workspace1: {
    id: uuidv4(),
    slug: `test-workspace-1-${TEST_RUN_ID}`,
    name: 'Test Workspace 1',
    users: {
      admin: {
        id: uuidv4(),
        email: `admin1-${TEST_RUN_ID}@test.com`,
        supabaseUserId: '', // Will be set during createTestWorkspaces()
        role: 'ADMIN',
      },
      manager: {
        id: uuidv4(),
        email: `manager1-${TEST_RUN_ID}@test.com`,
        supabaseUserId: '', // Will be set during createTestWorkspaces()
        role: 'MANAGER',
      },
      participant: {
        id: uuidv4(),
        email: `participant1-${TEST_RUN_ID}@test.com`,
        supabaseUserId: '', // Will be set during createTestWorkspaces()
        role: 'PARTICIPANT',
      },
      otherParticipant: {
        id: uuidv4(),
        email: `participant2-${TEST_RUN_ID}@test.com`,
        supabaseUserId: '', // Will be set during createTestWorkspaces()
        role: 'PARTICIPANT',
      },
    },
    challenge: {
      id: uuidv4(),
      title: 'Test Challenge 1',
      workspaceId: '',
    },
    unassignedChallenge: {
      id: uuidv4(),
      title: 'Unassigned Challenge 1',
      workspaceId: '',
    },
    activityTemplate: {
      id: uuidv4(),
      name: 'Text Submission Template 1',
      description: 'Test text submission template',
      type: 'TEXT_SUBMISSION',
      workspaceId: '',
    },
    assignedActivity: {
      id: uuidv4(),
      title: 'Assigned Activity',
      challengeId: '',
      templateId: '',
    },
    unassignedActivity: {
      id: uuidv4(),
      title: 'Unassigned Activity',
      challengeId: '',
      templateId: '',
    },
    enrollment: {
      id: uuidv4(),
      userId: '',
      challengeId: '',
    },
    assignedSubmission: {
      id: uuidv4(),
      userId: '',
      activityId: '',
      enrollmentId: '',
      status: 'PENDING',
    },
    assignments: [],
    expiredInvite: {
      id: uuidv4(),
      code: `EXPIRED123-${TEST_RUN_ID}`,
      workspaceId: '',
      createdBy: '', // Will be set during createTestWorkspaces()
      expiresAt: new Date('2020-01-01'),
    },
  },
  workspace2: {
    id: uuidv4(),
    slug: `test-workspace-2-${TEST_RUN_ID}`,
    name: 'Test Workspace 2',
    users: {
      admin: {
        id: uuidv4(),
        email: `admin2-${TEST_RUN_ID}@test.com`,
        supabaseUserId: '', // Will be set during createTestWorkspaces()
        role: 'ADMIN',
      },
      manager: {
        id: uuidv4(),
        email: `manager2-${TEST_RUN_ID}@test.com`,
        supabaseUserId: '', // Will be set during createTestWorkspaces()
        role: 'MANAGER',
      },
      participant: {
        id: uuidv4(),
        email: `participant3-${TEST_RUN_ID}@test.com`,
        supabaseUserId: '', // Will be set during createTestWorkspaces()
        role: 'PARTICIPANT',
      },
      otherParticipant: {
        id: uuidv4(),
        email: `participant4-${TEST_RUN_ID}@test.com`,
        supabaseUserId: '', // Will be set during createTestWorkspaces()
        role: 'PARTICIPANT',
      },
    },
    challenge: {
      id: uuidv4(),
      title: 'Test Challenge 2',
      workspaceId: '',
    },
    unassignedChallenge: {
      id: uuidv4(),
      title: 'Unassigned Challenge 2',
      workspaceId: '',
    },
    activityTemplate: {
      id: uuidv4(),
      name: 'Text Submission Template 2',
      description: 'Test text submission template',
      type: 'TEXT_SUBMISSION',
      workspaceId: '',
    },
    assignedActivity: {
      id: uuidv4(),
      title: 'Assigned Activity 2',
      challengeId: '',
      templateId: '',
    },
    unassignedActivity: {
      id: uuidv4(),
      title: 'Unassigned Activity 2',
      challengeId: '',
      templateId: '',
    },
    enrollment: {
      id: uuidv4(),
      userId: '',
      challengeId: '',
    },
    assignedSubmission: {
      id: uuidv4(),
      userId: '',
      activityId: '',
      enrollmentId: '',
      status: 'PENDING',
    },
    assignments: [],
    expiredInvite: {
      id: uuidv4(),
      code: `EXPIRED456-${TEST_RUN_ID}`,
      workspaceId: '',
      createdBy: '', // Will be set during createTestWorkspaces()
      expiresAt: new Date('2020-01-01'),
    },
  },
};

// Link references
TEST_WORKSPACES.workspace1.challenge.workspaceId = TEST_WORKSPACES.workspace1.id;
TEST_WORKSPACES.workspace1.unassignedChallenge.workspaceId = TEST_WORKSPACES.workspace1.id;
TEST_WORKSPACES.workspace1.activityTemplate.workspaceId = TEST_WORKSPACES.workspace1.id;
TEST_WORKSPACES.workspace1.assignedActivity.challengeId = TEST_WORKSPACES.workspace1.challenge.id;
TEST_WORKSPACES.workspace1.assignedActivity.templateId = TEST_WORKSPACES.workspace1.activityTemplate.id;
TEST_WORKSPACES.workspace1.unassignedActivity.challengeId = TEST_WORKSPACES.workspace1.unassignedChallenge.id; // Different challenge, no manager assignments
TEST_WORKSPACES.workspace1.unassignedActivity.templateId = TEST_WORKSPACES.workspace1.activityTemplate.id;
TEST_WORKSPACES.workspace1.enrollment.userId = TEST_WORKSPACES.workspace1.users.participant.id;
TEST_WORKSPACES.workspace1.enrollment.challengeId = TEST_WORKSPACES.workspace1.challenge.id;
TEST_WORKSPACES.workspace1.assignedSubmission.userId = TEST_WORKSPACES.workspace1.users.participant.id;
TEST_WORKSPACES.workspace1.assignedSubmission.activityId = TEST_WORKSPACES.workspace1.assignedActivity.id;
TEST_WORKSPACES.workspace1.assignedSubmission.enrollmentId = TEST_WORKSPACES.workspace1.enrollment.id;
TEST_WORKSPACES.workspace1.expiredInvite.workspaceId = TEST_WORKSPACES.workspace1.id;
TEST_WORKSPACES.workspace1.expiredInvite.createdBy = TEST_WORKSPACES.workspace1.users.admin.id;

TEST_WORKSPACES.workspace2.challenge.workspaceId = TEST_WORKSPACES.workspace2.id;
TEST_WORKSPACES.workspace2.unassignedChallenge.workspaceId = TEST_WORKSPACES.workspace2.id;
TEST_WORKSPACES.workspace2.activityTemplate.workspaceId = TEST_WORKSPACES.workspace2.id;
TEST_WORKSPACES.workspace2.assignedActivity.challengeId = TEST_WORKSPACES.workspace2.challenge.id;
TEST_WORKSPACES.workspace2.assignedActivity.templateId = TEST_WORKSPACES.workspace2.activityTemplate.id;
TEST_WORKSPACES.workspace2.unassignedActivity.challengeId = TEST_WORKSPACES.workspace2.unassignedChallenge.id; // Different challenge, no manager assignments
TEST_WORKSPACES.workspace2.unassignedActivity.templateId = TEST_WORKSPACES.workspace2.activityTemplate.id;
TEST_WORKSPACES.workspace2.enrollment.userId = TEST_WORKSPACES.workspace2.users.participant.id;
TEST_WORKSPACES.workspace2.enrollment.challengeId = TEST_WORKSPACES.workspace2.challenge.id;
TEST_WORKSPACES.workspace2.assignedSubmission.userId = TEST_WORKSPACES.workspace2.users.participant.id;
TEST_WORKSPACES.workspace2.assignedSubmission.activityId = TEST_WORKSPACES.workspace2.assignedActivity.id;
TEST_WORKSPACES.workspace2.assignedSubmission.enrollmentId = TEST_WORKSPACES.workspace2.enrollment.id;
TEST_WORKSPACES.workspace2.expiredInvite.workspaceId = TEST_WORKSPACES.workspace2.id;
TEST_WORKSPACES.workspace2.expiredInvite.createdBy = TEST_WORKSPACES.workspace2.users.admin.id;

/**
 * Create test workspaces and all associated data
 * Uses Prisma for database operations (bypasses RLS) and Supabase for auth operations
 */
export async function createTestWorkspaces(client: SupabaseClient): Promise<void> {
  // Ensure clean state by deleting workspaces with these exact IDs if they exist
  // This handles cases where previous test runs failed to clean up
  const workspaceIds = [TEST_WORKSPACES.workspace1.id, TEST_WORKSPACES.workspace2.id];

  try {
    // Delete all related data first (cascade will handle most, but be explicit)
    await prisma.activitySubmission.deleteMany({
      where: {
        Activity: {
          Challenge: {
            workspaceId: { in: workspaceIds },
          },
        },
      },
    });
    await prisma.challengeAssignment.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.enrollment.deleteMany({
      where: {
        Challenge: { workspaceId: { in: workspaceIds } },
      },
    });
    await prisma.activity.deleteMany({
      where: {
        Challenge: { workspaceId: { in: workspaceIds } },
      },
    });
    await prisma.activityTemplate.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.challenge.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.inviteCode.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.workspaceMembership.deleteMany({ where: { workspaceId: { in: workspaceIds } } });

    // Find and delete users in these workspaces
    const users = await prisma.user.findMany({
      where: {
        WorkspaceMembership: {
          some: { workspaceId: { in: workspaceIds } },
        },
      },
    });

    for (const user of users) {
      if (user.supabaseUserId) {
        try {
          await client.auth.admin.deleteUser(user.supabaseUserId);
        } catch {
          // Ignore if already deleted
        }
      }
      try {
        await prisma.user.delete({ where: { id: user.id } });
      } catch {
        // Ignore if already deleted
      }
    }

    // Finally delete the workspaces
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    console.log('Pre-creation cleanup completed');
  } catch (error) {
    console.log('Pre-creation cleanup had errors (may be expected if data didnt exist):', error);
  }

  // Create workspaces using Prisma
  const workspaceResult = await prisma.workspace.createMany({
    data: [
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
    ],
  });

  console.log(`Created ${workspaceResult.count} workspaces`);

  // Create Supabase auth users and link to User records
  for (const workspace of [TEST_WORKSPACES.workspace1, TEST_WORKSPACES.workspace2]) {
    for (const user of Object.values(workspace.users)) {
      // Create Supabase auth user (must use Supabase client)
      const { data: authUser, error: authError } = await client.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });

      if (authError) {
        throw new Error(`Failed to create Supabase auth user for ${user.email}: ${authError.message}`);
      }

      if (!authUser.user) {
        throw new Error(`No user returned from Supabase for ${user.email}`);
      }

      user.supabaseUserId = authUser.user.id;

      // Create User record using Prisma (bypasses RLS)
      const createdUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          supabaseUserId: authUser.user.id,
          // Note: Users are linked to workspaces via WorkspaceMembership (role is there)
        },
      });

      console.log(`Created User: ${user.email} with supabaseUserId: ${authUser.user.id}`);

      // Verify User was actually created in database
      const verifyUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      console.log(`Verified User exists in DB: ${!!verifyUser}, supabaseUserId: ${verifyUser?.supabaseUserId}`);

      // Create WorkspaceMembership using Prisma (bypasses RLS)
      await prisma.workspaceMembership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          supabaseUserId: user.supabaseUserId, // Required for RLS helper function
          role: user.role,
        },
      });
    }

    // Create challenges using Prisma
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30); // 30 days from now

    await prisma.challenge.createMany({
      data: [
        {
          id: workspace.challenge.id,
          title: workspace.challenge.title,
          description: 'Test challenge description',
          workspaceId: workspace.id,
          startDate: now,
          endDate: endDate,
        },
        {
          id: workspace.unassignedChallenge.id,
          title: workspace.unassignedChallenge.title,
          description: 'Test challenge with no manager assignments',
          workspaceId: workspace.id,
          startDate: now,
          endDate: endDate,
        },
      ],
    });

    // Create activity template using Prisma (required before activities)
    await prisma.activityTemplate.create({
      data: {
        id: workspace.activityTemplate.id,
        name: workspace.activityTemplate.name,
        description: workspace.activityTemplate.description,
        type: workspace.activityTemplate.type,
        workspaceId: workspace.id,
      },
    });

    // Create activities using Prisma
    await prisma.activity.createMany({
      data: [
        {
          id: workspace.assignedActivity.id,
          templateId: workspace.activityTemplate.id,
          challengeId: workspace.challenge.id,
          pointsValue: 10,
        },
        {
          id: workspace.unassignedActivity.id,
          templateId: workspace.activityTemplate.id,
          challengeId: workspace.unassignedChallenge.id, // Different challenge with no assignments
          pointsValue: 10,
        },
      ],
    });

    // NOTE: We don't pre-create challenge assignments here because the API verification
    // tests are specifically designed to test assignment creation/deletion.
    // Tests will create assignments as needed via the API endpoints.

    // Create enrollment using Prisma (required before submissions)
    await prisma.enrollment.create({
      data: {
        id: workspace.enrollment.id,
        userId: workspace.enrollment.userId,
        challengeId: workspace.enrollment.challengeId,
      },
    });

    // Create activity submission using Prisma
    await prisma.activitySubmission.create({
      data: {
        id: workspace.assignedSubmission.id,
        userId: workspace.assignedSubmission.userId,
        activityId: workspace.assignedSubmission.activityId,
        enrollmentId: workspace.assignedSubmission.enrollmentId,
        status: workspace.assignedSubmission.status,
      },
    });

    // Create expired invite using Prisma
    await prisma.inviteCode.create({
      data: {
        id: workspace.expiredInvite.id,
        code: workspace.expiredInvite.code,
        workspaceId: workspace.id,
        expiresAt: workspace.expiredInvite.expiresAt,
        maxUses: 10,
        usedCount: 0,
        createdBy: workspace.expiredInvite.createdBy,
      },
    });
  }
}

/**
 * Clean up all test data
 * Uses Prisma for database operations (bypasses RLS) and Supabase for auth operations
 * Handles cleanup of both current test run and any stale data from previous failed runs
 */
export async function cleanupTestData(client: SupabaseClient): Promise<void> {
  try {
    // Get all test workspaces (current and any stale ones from previous runs)
    const testWorkspaces = await prisma.workspace.findMany({
      where: {
        slug: {
          startsWith: 'test-workspace-',
        },
      },
      select: { id: true },
    });

    const workspaceIds = testWorkspaces.map((w) => w.id);

    if (workspaceIds.length === 0) {
      return; // Nothing to clean up
    }

    // Delete in reverse order of creation to avoid foreign key constraints

    // Delete all test submissions
    await prisma.activitySubmission.deleteMany({
      where: {
        Activity: {
          Challenge: {
            workspaceId: {
              in: workspaceIds,
            },
          },
        },
      },
    });

    // Get all users in test workspaces FIRST (needed for FK cleanup)
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: '@test.com',
        },
      },
      select: { id: true, supabaseUserId: true },
    });

    const testUserIds = testUsers.map((u) => u.id);

    // Delete all test assignments (must check both workspaceId AND assignedBy due to FK)
    await prisma.challengeAssignment.deleteMany({
      where: {
        OR: [
          {
            workspaceId: {
              in: workspaceIds,
            },
          },
          {
            assignedBy: {
              in: testUserIds,
            },
          },
        ],
      },
    });

    // Delete all test enrollments
    await prisma.enrollment.deleteMany({
      where: {
        Challenge: {
          workspaceId: {
            in: workspaceIds,
          },
        },
      },
    });

    // Delete all test activities
    await prisma.activity.deleteMany({
      where: {
        Challenge: {
          workspaceId: {
            in: workspaceIds,
          },
        },
      },
    });

    // Delete all test activity templates
    await prisma.activityTemplate.deleteMany({
      where: {
        workspaceId: {
          in: workspaceIds,
        },
      },
    });

    // Delete all test challenges
    await prisma.challenge.deleteMany({
      where: {
        workspaceId: {
          in: workspaceIds,
        },
      },
    });

    // Delete all test invite codes (must happen before deleting users due to createdBy FK)
    await prisma.inviteCode.deleteMany({
      where: {
        OR: [
          {
            workspaceId: {
              in: workspaceIds,
            },
          },
          {
            createdBy: {
              in: testUserIds,
            },
          },
        ],
      },
    });

    // Delete all test workspace memberships
    await prisma.workspaceMembership.deleteMany({
      where: {
        workspaceId: {
          in: workspaceIds,
        },
      },
    });

    // Delete Supabase auth users and User records
    for (const user of testUsers) {
      // Delete Supabase auth user if it exists
      if (user.supabaseUserId) {
        try {
          await client.auth.admin.deleteUser(user.supabaseUserId);
        } catch (error) {
          // Ignore if user doesn't exist in Supabase
        }
      }

      // Delete User record
      try {
        await prisma.user.delete({
          where: { id: user.id },
        });
      } catch (error) {
        // Ignore if user doesn't exist
      }
    }

    // Delete all test workspaces
    await prisma.workspace.deleteMany({
      where: {
        id: {
          in: workspaceIds,
        },
      },
    });
  } catch (error) {
    console.error('Error during test data cleanup:', error);
    // Don't throw - we want cleanup to be best-effort
  }
}
