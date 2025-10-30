import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';

/**
 * Manager Approval Workflow Tests (Task 28)
 *
 * Tests the two-step approval workflow:
 * 1. Manager reviews submission → MANAGER_APPROVED or NEEDS_REVISION
 * 2. Admin final approves submission → APPROVED (awards points/rewards)
 *
 * Status flow:
 * - PENDING → MANAGER_APPROVED (manager approval)
 * - PENDING → NEEDS_REVISION (manager requests revision)
 * - MANAGER_APPROVED → APPROVED (admin final approval, awards points)
 * - MANAGER_APPROVED → REJECTED (admin override rejection)
 * - PENDING → APPROVED (direct admin approval, bypasses manager review)
 * - PENDING → REJECTED (direct admin rejection)
 */

test.describe('Manager Approval Workflow Tests', () => {
  const WORKSPACE_SLUG = 'alldigitalrewards';
  const MANAGER_EMAIL = 'tom.manager@alldigitalrewards.com';
  const PARTICIPANT_EMAIL = 'sarah.jones@alldigitalrewards.com';

  let workspaceId: string;
  let managerId: string;
  let participantId: string;
  let challengeId: string;
  let activityId: string;
  let activityTemplateId: string;
  let enrollmentId: string;

  test.beforeAll(async () => {
    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: WORKSPACE_SLUG }
    });
    workspaceId = workspace!.id;

    // Get manager user
    const manager = await prisma.user.findUnique({
      where: { email: MANAGER_EMAIL }
    });
    managerId = manager!.id;

    // Get participant user
    const participant = await prisma.user.findUnique({
      where: { email: PARTICIPANT_EMAIL }
    });
    participantId = participant!.id;

    // Create challenge
    challengeId = randomUUID();
    await prisma.challenge.create({
      data: {
        id: challengeId,
        title: `Workflow Test Challenge ${Date.now()}`,
        description: 'Test challenge for workflow tests',
        workspaceId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PUBLISHED',
        rewardType: 'points',
        rewardConfig: {
          pointsAmount: 100
        }
      }
    });

    // Assign manager to challenge
    await prisma.challengeAssignment.create({
      data: {
        challengeId,
        managerId,
        workspaceId,
        assignedBy: managerId
      }
    });

    // Create activity template
    const activityTemplate = await prisma.activityTemplate.create({
      data: {
        id: randomUUID(),
        name: 'Workflow Test Activity',
        description: 'Test activity for workflow tests',
        type: 'TEXT_SUBMISSION',
        basePoints: 100,
        workspaceId
      }
    });
    activityTemplateId = activityTemplate.id;

    // Create activity
    const activity = await prisma.activity.create({
      data: {
        id: randomUUID(),
        challengeId,
        templateId: activityTemplateId,
        pointsValue: 100,
        position: 0
      }
    });
    activityId = activity.id;

    // Create enrollment for participant
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId,
        status: 'ENROLLED'
      }
    });
    enrollmentId = enrollment.id;
  });

  test.afterAll(async () => {
    // Cleanup in reverse order
    await prisma.activitySubmission.deleteMany({
      where: { activityId }
    });
    await prisma.activity.deleteMany({
      where: { id: activityId }
    });
    await prisma.activityTemplate.deleteMany({
      where: { id: activityTemplateId }
    });
    await prisma.challengeAssignment.deleteMany({
      where: { challengeId }
    });
    await prisma.challenge.deleteMany({
      where: { id: challengeId }
    });
  });

  test('Manager approval updates status to MANAGER_APPROVED', async ({ page }) => {
    // Create submission
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission 1',
        status: 'PENDING'
      }
    });

    await loginWithCredentials(page, MANAGER_EMAIL, DEFAULT_PASSWORD);

    // Manager approves submission
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/manager-review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          action: 'approve',
          notes: 'Looks good!'
        }
      }
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.submission.status).toBe('MANAGER_APPROVED');
    expect(data.submission.managerNotes).toBe('Looks good!');

    // Verify in database
    const updated = await prisma.activitySubmission.findUnique({
      where: { id: submission.id }
    });
    expect(updated!.status).toBe('MANAGER_APPROVED');

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('Manager rejection updates status to NEEDS_REVISION', async ({ page }) => {
    // Create submission
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission 2',
        status: 'PENDING'
      }
    });

    await loginWithCredentials(page, MANAGER_EMAIL, DEFAULT_PASSWORD);

    // Manager requests revision
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/manager-review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          action: 'reject',
          notes: 'Please add more details'
        }
      }
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.submission.status).toBe('NEEDS_REVISION');
    expect(data.submission.managerNotes).toBe('Please add more details');

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('Admin final approval from MANAGER_APPROVED awards points', async ({ page }) => {
    // Create submission and manager-approve it
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission 3',
        status: 'MANAGER_APPROVED',
        managerNotes: 'Approved by manager'
      }
    });

    // Get participant's points before approval
    const pointsBalanceBefore = await prisma.pointsBalance.findUnique({
      where: {
        userId_workspaceId: {
          userId: participantId,
          workspaceId
        }
      }
    });
    const pointsBefore = pointsBalanceBefore?.totalPoints || 0;

    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Admin final approves submission
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: 'APPROVED',
          reviewNotes: 'Final approval',
          pointsAwarded: 100
        }
      }
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.submission.status).toBe('APPROVED');

    // Verify points were awarded
    const pointsBalanceAfter = await prisma.pointsBalance.findUnique({
      where: {
        userId_workspaceId: {
          userId: participantId,
          workspaceId
        }
      }
    });
    const pointsAfter = pointsBalanceAfter?.totalPoints || 0;
    expect(pointsAfter).toBe(pointsBefore + 100);

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
    // Reset participant points
    if (pointsBalanceBefore) {
      await prisma.pointsBalance.update({
        where: {
          userId_workspaceId: {
            userId: participantId,
            workspaceId
          }
        },
        data: {
          totalPoints: pointsBefore,
          availablePoints: pointsBefore
        }
      });
    } else if (pointsBalanceAfter) {
      await prisma.pointsBalance.delete({
        where: {
          userId_workspaceId: {
            userId: participantId,
            workspaceId
          }
        }
      });
    }
  });

  test('Admin can reject MANAGER_APPROVED submission (override)', async ({ page }) => {
    // Create manager-approved submission
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission 4',
        status: 'MANAGER_APPROVED',
        managerNotes: 'Approved by manager'
      }
    });

    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Admin overrides with rejection
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: 'REJECTED',
          reviewNotes: 'Admin override - does not meet quality standards'
        }
      }
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.submission.status).toBe('REJECTED');
    expect(data.submission.reviewNotes).toBe('Admin override - does not meet quality standards');

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('Admin can directly approve PENDING submission (bypass manager)', async ({ page }) => {
    // Create pending submission
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission 5',
        status: 'PENDING'
      }
    });

    const pointsBalanceBefore = await prisma.pointsBalance.findUnique({
      where: {
        userId_workspaceId: {
          userId: participantId,
          workspaceId
        }
      }
    });
    const pointsBefore = pointsBalanceBefore?.totalPoints || 0;

    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Admin directly approves
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: 'APPROVED',
          reviewNotes: 'Direct admin approval',
          pointsAwarded: 100
        }
      }
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.submission.status).toBe('APPROVED');

    // Verify points awarded
    const pointsBalanceAfter = await prisma.pointsBalance.findUnique({
      where: {
        userId_workspaceId: {
          userId: participantId,
          workspaceId
        }
      }
    });
    expect(pointsBalanceAfter!.totalPoints).toBe(pointsBefore + 100);

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
    if (pointsBalanceBefore) {
      await prisma.pointsBalance.update({
        where: {
          userId_workspaceId: {
            userId: participantId,
            workspaceId
          }
        },
        data: {
          totalPoints: pointsBefore,
          availablePoints: pointsBefore
        }
      });
    } else if (pointsBalanceAfter) {
      await prisma.pointsBalance.delete({
        where: {
          userId_workspaceId: {
            userId: participantId,
            workspaceId
          }
        }
      });
    }
  });

  test('Cannot final-approve submission that is not PENDING or MANAGER_APPROVED', async ({ page }) => {
    // Create already-approved submission
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission 6',
        status: 'APPROVED'
      }
    });

    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Try to approve again
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: 'APPROVED',
          reviewNotes: 'Trying to approve again',
          pointsAwarded: 100
        }
      }
    );

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already been reviewed');

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('Points are awarded only once on approval', async ({ page }) => {
    // Create manager-approved submission
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission 7',
        status: 'MANAGER_APPROVED'
      }
    });

    const pointsBalanceBefore = await prisma.pointsBalance.findUnique({
      where: {
        userId_workspaceId: {
          userId: participantId,
          workspaceId
        }
      }
    });
    const pointsBefore = pointsBalanceBefore?.totalPoints || 0;

    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Approve once
    await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: 'APPROVED',
          pointsAwarded: 100
        }
      }
    );

    // Check points
    const pointsBalanceAfter = await prisma.pointsBalance.findUnique({
      where: {
        userId_workspaceId: {
          userId: participantId,
          workspaceId
        }
      }
    });
    expect(pointsBalanceAfter!.totalPoints).toBe(pointsBefore + 100);

    // Try to approve again (should fail)
    const response2 = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: 'APPROVED',
          pointsAwarded: 100
        }
      }
    );

    expect(response2.status()).toBe(400);

    // Points should remain the same
    const pointsBalanceFinal = await prisma.pointsBalance.findUnique({
      where: {
        userId_workspaceId: {
          userId: participantId,
          workspaceId
        }
      }
    });
    expect(pointsBalanceFinal!.totalPoints).toBe(pointsBefore + 100);

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
    if (pointsBalanceBefore) {
      await prisma.pointsBalance.update({
        where: {
          userId_workspaceId: {
            userId: participantId,
            workspaceId
          }
        },
        data: {
          totalPoints: pointsBefore,
          availablePoints: pointsBefore
        }
      });
    } else if (pointsBalanceAfter) {
      await prisma.pointsBalance.delete({
        where: {
          userId_workspaceId: {
            userId: participantId,
            workspaceId
          }
        }
      });
    }
  });

  test('Invalid status action returns 400 error', async ({ page }) => {
    // Create submission
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission 8',
        status: 'PENDING'
      }
    });

    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Try with invalid status
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: 'INVALID_STATUS',
          reviewNotes: 'Test'
        }
      }
    );

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('status');

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('Manager review with invalid action returns 400 error', async ({ page }) => {
    // Create submission
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission 9',
        status: 'PENDING'
      }
    });

    await loginWithCredentials(page, MANAGER_EMAIL, DEFAULT_PASSWORD);

    // Try with invalid action
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/manager-review`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          action: 'invalid_action',
          notes: 'Test'
        }
      }
    );

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('action');

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });
});
