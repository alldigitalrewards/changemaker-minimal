import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';

/**
 * Challenge Assignment Tests (Task 29)
 *
 * Tests CRUD operations for manager-to-challenge assignments:
 * - Create assignment (assign manager to challenge)
 * - List assignments for a challenge
 * - Remove assignment (unassign manager from challenge)
 * - Validation: workspace isolation, role requirements, duplicate prevention
 */

test.describe('Challenge Assignment Tests', () => {
  const WORKSPACE_SLUG = 'alldigitalrewards';
  const MANAGER_EMAIL = 'tom.manager@alldigitalrewards.com';
  const PARTICIPANT_EMAIL = 'sarah.jones@alldigitalrewards.com';

  let workspaceId: string;
  let managerId: string;
  let participantId: string;
  let challengeId: string;

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

    // Create test challenge
    challengeId = randomUUID();
    await prisma.challenge.create({
      data: {
        id: challengeId,
        title: `Assignment Test Challenge ${Date.now()}`,
        description: 'Test challenge for assignment tests',
        workspaceId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PUBLISHED',
        userId: managerId
      }
    });
  });

  test.afterAll(async () => {
    // Cleanup assignments and challenge
    await prisma.challengeAssignment.deleteMany({
      where: { challengeId }
    });
    await prisma.challenge.deleteMany({
      where: { id: challengeId }
    });
  });

  test('Admin can assign manager to challenge', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          managerId
        }
      }
    );

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.assignment).toBeDefined();
    expect(data.assignment.challengeId).toBe(challengeId);
    expect(data.assignment.managerId).toBe(managerId);
    expect(data.assignment.workspaceId).toBe(workspaceId);

    // Verify in database
    const assignment = await prisma.challengeAssignment.findFirst({
      where: {
        challengeId,
        managerId
      }
    });
    expect(assignment).toBeDefined();
    expect(assignment!.challengeId).toBe(challengeId);
    expect(assignment!.managerId).toBe(managerId);
  });

  test('Admin can list managers assigned to challenge', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const response = await page.request.get(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.assignments).toBeDefined();
    expect(Array.isArray(data.assignments)).toBe(true);

    // Should include our assignment from previous test
    const ourAssignment = data.assignments.find(
      (a: any) => a.managerId === managerId && a.challengeId === challengeId
    );
    expect(ourAssignment).toBeDefined();
  });

  test('Manager can list assignments they have access to', async ({ page }) => {
    await loginWithCredentials(page, MANAGER_EMAIL, DEFAULT_PASSWORD);

    const response = await page.request.get(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.assignments).toBeDefined();
  });

  test('Admin can unassign manager from challenge', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const response = await page.request.delete(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers/${managerId}`
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('unassigned');

    // Verify removal in database
    const assignment = await prisma.challengeAssignment.findFirst({
      where: {
        challengeId,
        managerId
      }
    });
    expect(assignment).toBeNull();
  });

  test('Cannot assign PARTICIPANT role as manager (400)', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          managerId: participantId // This user has PARTICIPANT role, not MANAGER
        }
      }
    );

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('not a manager');

    // Verify NOT created in database
    const assignment = await prisma.challengeAssignment.findFirst({
      where: {
        challengeId,
        managerId: participantId
      }
    });
    expect(assignment).toBeNull();
  });

  test('Cannot create duplicate assignment', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Create initial assignment
    await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          managerId
        }
      }
    );

    // Try to create duplicate
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          managerId
        }
      }
    );

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already assigned');

    // Verify only one assignment exists
    const assignments = await prisma.challengeAssignment.findMany({
      where: {
        challengeId,
        managerId
      }
    });
    expect(assignments.length).toBe(1);

    // Cleanup
    await prisma.challengeAssignment.deleteMany({
      where: { challengeId, managerId }
    });
  });

  test('Cannot assign manager from different workspace (400)', async ({ page }) => {
    // Get a different workspace
    const otherWorkspace = await prisma.workspace.findFirst({
      where: {
        slug: { not: WORKSPACE_SLUG },
        active: true
      }
    });

    if (!otherWorkspace) {
      test.skip();
      return;
    }

    // Get a manager from the other workspace
    const otherManager = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId: otherWorkspace.id,
        role: 'MANAGER'
      },
      include: {
        User: true
      }
    });

    if (!otherManager) {
      test.skip();
      return;
    }

    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Try to assign manager from different workspace
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          managerId: otherManager.userId
        }
      }
    );

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('not a manager');

    // Verify NOT created
    const assignment = await prisma.challengeAssignment.findFirst({
      where: {
        challengeId,
        managerId: otherManager.userId
      }
    });
    expect(assignment).toBeNull();
  });

  test('PARTICIPANT cannot access assignment endpoints (403)', async ({ page }) => {
    await loginWithCredentials(page, PARTICIPANT_EMAIL, DEFAULT_PASSWORD);

    // Try to list assignments
    const listResponse = await page.request.get(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`
    );
    expect(listResponse.status()).toBe(403);

    // Try to create assignment
    const createResponse = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          managerId
        }
      }
    );
    expect(createResponse.status()).toBe(403);

    // Try to delete assignment
    const deleteResponse = await page.request.delete(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers/${managerId}`
    );
    expect(deleteResponse.status()).toBe(403);
  });

  test('Cannot assign to non-existent challenge (404)', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const fakeId = randomUUID();
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${fakeId}/managers`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          managerId
        }
      }
    );

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('Cannot assign non-existent user (400)', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const fakeUserId = randomUUID();
    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          managerId: fakeUserId
        }
      }
    );

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('not a manager');
  });

  test('Missing managerId parameter returns 400', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const response = await page.request.post(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {}
      }
    );

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('managerId');
  });

  test('Cross-workspace isolation: cannot unassign from other workspace', async ({ page }) => {
    // Get a different workspace
    const otherWorkspace = await prisma.workspace.findFirst({
      where: {
        slug: { not: WORKSPACE_SLUG },
        active: true
      }
    });

    if (!otherWorkspace) {
      test.skip();
      return;
    }

    // Get admin from other workspace
    const otherAdmin = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId: otherWorkspace.id,
        role: 'ADMIN'
      },
      include: {
        User: true
      }
    });

    if (!otherAdmin) {
      test.skip();
      return;
    }

    // Create assignment in our workspace
    await prisma.challengeAssignment.create({
      data: {
        challengeId,
        managerId,
        workspaceId,
        assignedBy: managerId
      }
    });

    // Login as admin from other workspace
    await loginWithCredentials(page, otherAdmin.User.email, DEFAULT_PASSWORD);

    // Try to unassign from our workspace (should fail due to workspace mismatch)
    const response = await page.request.delete(
      `/api/workspaces/${WORKSPACE_SLUG}/challenges/${challengeId}/managers/${managerId}`
    );

    // Expect 403 (unauthorized) because they're not admin in this workspace
    expect(response.status()).toBe(403);

    // Verify assignment still exists
    const assignment = await prisma.challengeAssignment.findFirst({
      where: {
        challengeId,
        managerId
      }
    });
    expect(assignment).toBeDefined();

    // Cleanup
    await prisma.challengeAssignment.deleteMany({
      where: { challengeId, managerId }
    });
  });
});
