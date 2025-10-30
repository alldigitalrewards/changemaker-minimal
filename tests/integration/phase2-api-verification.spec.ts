/**
 * Phase 2 API Verification Tests - Manager Role with RLS
 *
 * This test suite verifies that all Phase 2 Manager API endpoints work correctly
 * with Row-Level Security (RLS) policies enabled. Tests cover:
 * - Manager Assignment CRUD operations
 * - Manager Queue endpoint (assigned submissions only)
 * - Manager Review workflow (approve/reject)
 * - Admin Override functionality
 * - Workspace isolation enforcement
 * - Cross-workspace access prevention
 *
 * All tests use real API routes with cookie-based authentication and RLS policies active.
 */

import { test, expect } from '@playwright/test';
import { TEST_WORKSPACES, createTestWorkspaces, cleanupTestData } from '../fixtures/rls-test-data';
import { createServiceRoleClient } from '../utils/supabase-auth-test';
import { loginWithCredentials, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';

// Configure tests to run serially to avoid database conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Phase 2 API Verification with RLS', () => {
  test.beforeAll(async () => {
    // Clean up any stale data from previous failed runs
    const serviceClient = createServiceRoleClient();
    await cleanupTestData(serviceClient);

    // Create test workspaces with Supabase service role client
    await createTestWorkspaces(serviceClient);
  });

  test.afterAll(async () => {
    // Cleanup test data
    const serviceClient = createServiceRoleClient();
    await cleanupTestData(serviceClient);
  });

  // =================================================================
  // CATEGORY 1: MANAGER ASSIGNMENT CRUD
  // =================================================================
  test.describe('Manager Assignment CRUD', () => {
    test('admin can assign manager to challenge', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

      // POST /api/workspaces/[slug]/challenges/[id]/managers
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${TEST_WORKSPACES.workspace1.challenge.id}/managers`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            managerId: TEST_WORKSPACES.workspace1.users.manager.id,
          },
        }
      );

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.assignment).toBeDefined();
      expect(body.assignment.managerId).toBe(TEST_WORKSPACES.workspace1.users.manager.id);
      expect(body.assignment.challengeId).toBe(TEST_WORKSPACES.workspace1.challenge.id);

      // NOTE: No cleanup - the assignment is kept for subsequent tests in serial mode
      // The assignment will be deleted in the "admin can remove manager assignment" test
    });

    test('admin can list assigned managers', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

      // GET /api/workspaces/[slug]/challenges/[id]/managers
      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${TEST_WORKSPACES.workspace1.challenge.id}/managers`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.assignments).toBeDefined();
      expect(Array.isArray(body.assignments)).toBe(true);

      // Should have the manager assigned in test fixtures
      expect(body.assignments.length).toBeGreaterThan(0);
      const managerAssignment = body.assignments.find(
        (a: any) => a.managerId === TEST_WORKSPACES.workspace1.users.manager.id
      );
      expect(managerAssignment).toBeDefined();
    });

    test('admin can remove manager assignment', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

      // DELETE /api/workspaces/[slug]/challenges/[id]/managers/[managerId]
      // Deletes the assignment created in the first test
      const response = await page.request.delete(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${TEST_WORKSPACES.workspace1.challenge.id}/managers/${TEST_WORKSPACES.workspace1.users.manager.id}`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      // Verify assignment was deleted via API
      const verifyResponse = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${TEST_WORKSPACES.workspace1.challenge.id}/managers`
      );
      const verifyBody = await verifyResponse.json();
      const stillExists = verifyBody.assignments.find(
        (a: any) => a.managerId === TEST_WORKSPACES.workspace1.users.manager.id
      );
      expect(stillExists).toBeUndefined();
    });

    test('manager cannot assign themselves', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.manager.email, DEFAULT_PASSWORD);

      // POST /api/workspaces/[slug]/challenges/[id]/managers
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${TEST_WORKSPACES.workspace1.challenge.id}/managers`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            managerId: TEST_WORKSPACES.workspace1.users.otherParticipant.id,
          },
        }
      );

      // Should fail - manager doesn't have permission (403) or endpoint requires ADMIN (401)
      expect([401, 403]).toContain(response.status());
    });

    test('cross-workspace assignment blocked', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

      // Try to assign manager in workspace2 (should fail)
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/challenges/${TEST_WORKSPACES.workspace2.challenge.id}/managers`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            managerId: TEST_WORKSPACES.workspace2.users.manager.id,
          },
        }
      );

      // Should fail - admin1 doesn't have access to workspace2
      expect([401, 403, 404]).toContain(response.status());
    });

    // Re-create assignment for subsequent tests (Manager Queue, Admin Override, etc.)
    test('setup: re-create assignment for remaining tests', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

      // POST /api/workspaces/[slug]/challenges/[id]/managers
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${TEST_WORKSPACES.workspace1.challenge.id}/managers`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            managerId: TEST_WORKSPACES.workspace1.users.manager.id,
          },
        }
      );

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.assignment).toBeDefined();
    });
  });

  // =================================================================
  // CATEGORY 2: MANAGER QUEUE & REVIEW
  // =================================================================
  test.describe('Manager Queue & Review', () => {
    test('manager sees only assigned challenge submissions', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.manager.email, DEFAULT_PASSWORD);

      // GET /api/workspaces/[slug]/manager/queue
      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/manager/queue`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.submissions).toBeDefined();
      expect(Array.isArray(body.submissions)).toBe(true);

      // All submissions should be for assigned challenge
      body.submissions.forEach((submission: any) => {
        expect(submission.Activity.challengeId).toBe(TEST_WORKSPACES.workspace1.challenge.id);
      });

      // Should NOT see submissions for unassigned activity
      const unassignedSubmission = body.submissions.find(
        (s: any) => s.activityId === TEST_WORKSPACES.workspace1.unassignedActivity.id
      );
      expect(unassignedSubmission).toBeUndefined();
    });

    test('manager can approve assigned submission', async ({ page }) => {
      // Create temporary submission for manager to approve using Prisma (bypasses RLS)
      const tempSubmission = await prisma.activitySubmission.create({
        data: {
          id: randomUUID(),
          userId: TEST_WORKSPACES.workspace1.users.participant.id,
          activityId: TEST_WORKSPACES.workspace1.assignedActivity.id,
          enrollmentId: TEST_WORKSPACES.workspace1.enrollment.id,
          status: 'PENDING',
        },
      });

      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.manager.email, DEFAULT_PASSWORD);

      // POST /api/workspaces/[slug]/submissions/[id]/manager-review
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/submissions/${tempSubmission.id}/manager-review`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            action: 'approve',
            notes: 'Looks good!',
          },
        }
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.submission).toBeDefined();
      expect(body.submission.status).toBe('MANAGER_APPROVED');
      expect(body.submission.managerReviewedBy).toBe(TEST_WORKSPACES.workspace1.users.manager.id);

      // Cleanup
      await prisma.activitySubmission.delete({ where: { id: tempSubmission.id } });
    });

    test('manager cannot see unassigned submissions', async ({ page }) => {
      // Create submission for unassigned activity using Prisma (bypasses RLS)
      const unassignedSubmission = await prisma.activitySubmission.create({
        data: {
          id: randomUUID(),
          userId: TEST_WORKSPACES.workspace1.users.otherParticipant.id,
          activityId: TEST_WORKSPACES.workspace1.unassignedActivity.id,
          enrollmentId: TEST_WORKSPACES.workspace1.enrollment.id,
          status: 'PENDING',
        },
      });

      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.manager.email, DEFAULT_PASSWORD);

      // Try to approve unassigned submission (should fail)
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/submissions/${unassignedSubmission.id}/manager-review`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            action: 'approve',
            notes: 'Trying to approve unassigned submission',
          },
        }
      );

      // Should fail - manager not assigned to this challenge
      expect(response.status()).toBeGreaterThanOrEqual(400); // 403 or 404 expected

      // Cleanup
      await prisma.activitySubmission.delete({ where: { id: unassignedSubmission.id } });
    });

    test('cross-workspace queue access blocked', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.manager.email, DEFAULT_PASSWORD);

      // Try to access workspace2 manager queue (should fail)
      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/manager/queue`
      );

      // Should fail - manager1 doesn't have access to workspace2
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  // =================================================================
  // CATEGORY 3: ADMIN OVERRIDE
  // =================================================================
  test.describe('Admin Override', () => {
    test('admin can approve MANAGER_APPROVED submission', async ({ page }) => {
      // Create submission with MANAGER_APPROVED status using Prisma (bypasses RLS)
      const tempSubmission = await prisma.activitySubmission.create({
        data: {
          id: randomUUID(),
          userId: TEST_WORKSPACES.workspace1.users.participant.id,
          activityId: TEST_WORKSPACES.workspace1.assignedActivity.id,
          enrollmentId: TEST_WORKSPACES.workspace1.enrollment.id,
          status: 'MANAGER_APPROVED',
          managerReviewedBy: TEST_WORKSPACES.workspace1.users.manager.id,
        },
      });

      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

      // POST /api/workspaces/[slug]/submissions/[id]/review
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/submissions/${tempSubmission.id}/review`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            status: 'APPROVED',
            reviewNotes: 'Final approval',
            pointsAwarded: 10,
          },
        }
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.submission).toBeDefined();
      expect(body.submission.status).toBe('APPROVED');
      expect(body.submission.reviewedBy).toBe(TEST_WORKSPACES.workspace1.users.admin.id);

      // Cleanup
      await prisma.activitySubmission.delete({ where: { id: tempSubmission.id } });
    });

    test('admin can reject MANAGER_APPROVED submission', async ({ page }) => {
      // Create submission with MANAGER_APPROVED status using Prisma (bypasses RLS)
      const tempSubmission = await prisma.activitySubmission.create({
        data: {
          id: randomUUID(),
          userId: TEST_WORKSPACES.workspace1.users.participant.id,
          activityId: TEST_WORKSPACES.workspace1.assignedActivity.id,
          enrollmentId: TEST_WORKSPACES.workspace1.enrollment.id,
          status: 'MANAGER_APPROVED',
          managerReviewedBy: TEST_WORKSPACES.workspace1.users.manager.id,
        },
      });

      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

      // POST /api/workspaces/[slug]/submissions/[id]/review
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/submissions/${tempSubmission.id}/review`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            status: 'REJECTED',
            reviewNotes: 'Does not meet requirements',
          },
        }
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.submission).toBeDefined();
      expect(body.submission.status).toBe('REJECTED');
      expect(body.submission.reviewedBy).toBe(TEST_WORKSPACES.workspace1.users.admin.id);

      // Cleanup
      await prisma.activitySubmission.delete({ where: { id: tempSubmission.id } });
    });

    test('admin override tracked in ActivityEvent', async ({ page }) => {
      // Create submission with MANAGER_APPROVED status using Prisma (bypasses RLS)
      const tempSubmission = await prisma.activitySubmission.create({
        data: {
          id: randomUUID(),
          userId: TEST_WORKSPACES.workspace1.users.participant.id,
          activityId: TEST_WORKSPACES.workspace1.assignedActivity.id,
          enrollmentId: TEST_WORKSPACES.workspace1.enrollment.id,
          status: 'MANAGER_APPROVED',
          managerReviewedBy: TEST_WORKSPACES.workspace1.users.manager.id,
        },
      });

      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

      // POST /api/workspaces/[slug]/submissions/[id]/review
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/submissions/${tempSubmission.id}/review`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            status: 'APPROVED',
            reviewNotes: 'Final approval for tracking test',
            pointsAwarded: 10,
          },
        }
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.submission.status).toBe('APPROVED');
      expect(body.submission.reviewNotes).toBe('Final approval for tracking test');

      // Verify ActivityEvent was created (event is logged without enrollmentId)
      const events = await prisma.activityEvent.findMany({
        where: {
          workspaceId: TEST_WORKSPACES.workspace1.id,
          challengeId: TEST_WORKSPACES.workspace1.challenge.id,
          type: 'SUBMISSION_APPROVED',
          actorUserId: TEST_WORKSPACES.workspace1.users.admin.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].actorUserId).toBe(TEST_WORKSPACES.workspace1.users.admin.id);

      // Cleanup (delete only the events we created in this test)
      const eventIds = events.map(e => e.id);
      await prisma.activityEvent.deleteMany({
        where: { id: { in: eventIds } },
      });
      await prisma.activitySubmission.delete({ where: { id: tempSubmission.id } });
    });
  });

  // =================================================================
  // CATEGORY 4: WORKSPACE ISOLATION VERIFICATION
  // =================================================================
  test.describe('Workspace Isolation', () => {
    test('manager queue enforces workspace isolation', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.manager.email, DEFAULT_PASSWORD);

      // GET manager queue
      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/manager/queue`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      // Verify NO workspace2 submissions appear
      body.submissions.forEach((submission: any) => {
        expect(submission.Activity.Challenge.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);
        expect(submission.Activity.Challenge.workspaceId).not.toBe(TEST_WORKSPACES.workspace2.id);
      });
    });

    test('admin can only manage own workspace assignments', async ({ page }) => {
      await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

      // GET workspace1 assignments (should succeed)
      const response1 = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${TEST_WORKSPACES.workspace1.challenge.id}/managers`
      );

      expect(response1.status()).toBe(200);

      // Try to GET workspace2 assignments (should fail)
      const response2 = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/challenges/${TEST_WORKSPACES.workspace2.challenge.id}/managers`
      );

      // Should fail - admin1 doesn't have access to workspace2
      expect([401, 403, 404]).toContain(response2.status());
    });

    test('participant cannot access manager endpoints', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.participant.email,
        DEFAULT_PASSWORD
      );

      // Try to access manager queue (should fail)
      const queueResponse = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/manager/queue`
      );

      expect([401, 403]).toContain(queueResponse.status());

      // Try to create assignment (should fail)
      const assignResponse = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${TEST_WORKSPACES.workspace1.challenge.id}/managers`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            managerId: TEST_WORKSPACES.workspace1.users.manager.id,
          },
        }
      );

      expect([401, 403]).toContain(assignResponse.status());
    });
  });
});
