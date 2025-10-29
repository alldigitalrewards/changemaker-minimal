/**
 * Cross-Tenant Isolation Security Tests
 *
 * These tests verify that workspace isolation is properly enforced across all
 * critical boundaries to prevent data leakage and unauthorized access between tenants.
 *
 * Test Categories:
 * 1. Data Leakage Prevention (Read Operations)
 * 2. Unauthorized Mutations (Write Operations)
 * 3. Direct ID Access (IDOR Prevention)
 * 4. List Endpoint Filtering
 * 5. Points/Rewards Isolation
 * 6. Role-Based Access Control Across Workspaces
 */

import { test, expect, Page } from '@playwright/test';
import { prisma } from '../../lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { loginWithCredentials } from '../e2e/support/auth';
import { TEST_WORKSPACES, createTestWorkspaces, cleanupTestData, DEFAULT_PASSWORD } from '../fixtures/rls-test-data';
import { randomUUID } from 'crypto';

test.describe('Cross-Tenant Isolation Security Tests', () => {
  // Force serial execution to prevent race conditions with shared test data
  test.describe.configure({ mode: 'serial' });

  let supabaseClient: any;

  test.beforeAll(async () => {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    await cleanupTestData(supabaseClient);
    await createTestWorkspaces(supabaseClient);
  });

  test.afterAll(async () => {
    await cleanupTestData(supabaseClient);
  });

  test.describe('1. Data Leakage Prevention (Read Operations)', () => {
    test('participant cannot list challenges from other workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.participant.email,
        DEFAULT_PASSWORD
      );

      // Try to access workspace2 challenges via API
      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/challenges`
      );

      // Should be blocked - either 403 (Forbidden) or 404 (Not Found)
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin cannot view enrollments from other workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/enrollments`
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('manager cannot access other workspace submissions', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.manager.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/manager/queue`
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('participant cannot view other workspace user list', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.participant.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/users`
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('2. Unauthorized Mutations (Write Operations)', () => {
    test('admin cannot create challenges in other workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/challenges`,
        {
          data: {
            title: 'Unauthorized Challenge',
            description: 'This should be blocked',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'DRAFT'
          }
        }
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('participant cannot enroll in other workspace challenges', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.participant.email,
        DEFAULT_PASSWORD
      );

      // Get a challenge from workspace2
      const workspace2Challenge = await prisma.challenge.findFirst({
        where: { workspaceId: TEST_WORKSPACES.workspace2.id }
      });

      if (!workspace2Challenge) {
        throw new Error('No workspace2 challenge found for test');
      }

      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${workspace2Challenge.id}/enroll`,
        {
          data: {}
        }
      );

      // Should fail - challenge doesn't exist in workspace1 context
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('manager cannot assign themselves to other workspace challenge', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.manager.email,
        DEFAULT_PASSWORD
      );

      const workspace2Challenge = await prisma.challenge.findFirst({
        where: { workspaceId: TEST_WORKSPACES.workspace2.id }
      });

      if (!workspace2Challenge) {
        throw new Error('No workspace2 challenge found for test');
      }

      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/challenges/${workspace2Challenge.id}/managers`,
        {
          data: {
            userId: TEST_WORKSPACES.workspace1.users.manager.id
          }
        }
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin cannot update other workspace challenge', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const workspace2Challenge = await prisma.challenge.findFirst({
        where: { workspaceId: TEST_WORKSPACES.workspace2.id }
      });

      if (!workspace2Challenge) {
        throw new Error('No workspace2 challenge found for test');
      }

      const response = await page.request.put(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${workspace2Challenge.id}`,
        {
          data: {
            title: 'Hacked Challenge Title'
          }
        }
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin cannot delete other workspace challenge', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const workspace2Challenge = await prisma.challenge.findFirst({
        where: { workspaceId: TEST_WORKSPACES.workspace2.id }
      });

      if (!workspace2Challenge) {
        throw new Error('No workspace2 challenge found for test');
      }

      const response = await page.request.delete(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${workspace2Challenge.id}`
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);

      // Verify challenge still exists
      const stillExists = await prisma.challenge.findUnique({
        where: { id: workspace2Challenge.id }
      });
      expect(stillExists).toBeTruthy();
    });
  });

  test.describe('3. Direct ID Access (IDOR Prevention)', () => {
    test('cannot access challenge by ID from different workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.participant.email,
        DEFAULT_PASSWORD
      );

      const workspace2Challenge = await prisma.challenge.findFirst({
        where: { workspaceId: TEST_WORKSPACES.workspace2.id }
      });

      if (!workspace2Challenge) {
        throw new Error('No workspace2 challenge found for test');
      }

      // Try to access workspace2 challenge via workspace1 context
      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${workspace2Challenge.id}`
      );

      // Should return 404 (not found in this workspace context)
      expect(response.status()).toBe(404);
    });

    test('cannot access enrollment by ID from different workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const workspace2Enrollment = await prisma.enrollment.findFirst({
        where: {
          Challenge: {
            workspaceId: TEST_WORKSPACES.workspace2.id
          }
        }
      });

      if (!workspace2Enrollment) {
        throw new Error('No workspace2 enrollment found for test');
      }

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/enrollments/${workspace2Enrollment.id}`
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('manager cannot approve submission from other workspace via direct ID', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.manager.email,
        DEFAULT_PASSWORD
      );

      // Find a submission from workspace2
      const workspace2Submission = await prisma.activitySubmission.findFirst({
        where: {
          Activity: {
            Challenge: {
              workspaceId: TEST_WORKSPACES.workspace2.id
            }
          }
        }
      });

      if (!workspace2Submission) {
        // Create one for testing
        const workspace2Activity = await prisma.activity.findFirst({
          where: {
            Challenge: {
              workspaceId: TEST_WORKSPACES.workspace2.id
            }
          }
        });

        if (!workspace2Activity) {
          test.skip();
          return;
        }

        const tempSubmission = await prisma.activitySubmission.create({
          data: {
            id: randomUUID(),
            activityId: workspace2Activity.id,
            userId: TEST_WORKSPACES.workspace2.users.participant.id,
            status: 'PENDING',
            submittedAt: new Date()
          }
        });

        const response = await page.request.post(
          `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/submissions/${tempSubmission.id}/manager-review`,
          {
            data: {
              status: 'MANAGER_APPROVED',
              feedback: 'Attempting cross-workspace access'
            }
          }
        );

        expect(response.status()).toBeGreaterThanOrEqual(400);

        // Cleanup
        await prisma.activitySubmission.delete({ where: { id: tempSubmission.id } });
      } else {
        const response = await page.request.post(
          `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/submissions/${workspace2Submission.id}/manager-review`,
          {
            data: {
              status: 'MANAGER_APPROVED',
              feedback: 'Attempting cross-workspace access'
            }
          }
        );

        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('admin cannot access user by ID from different workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/users/${TEST_WORKSPACES.workspace2.users.participant.id}`
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('4. List Endpoint Filtering', () => {
    test('challenge list only returns current workspace challenges', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.participant.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      // Verify all returned challenges belong to workspace1
      if (body.challenges && body.challenges.length > 0) {
        body.challenges.forEach((challenge: any) => {
          expect(challenge.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);
        });
      }
    });

    test('enrollment list only returns current workspace enrollments', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/enrollments`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      // Verify all returned enrollments belong to workspace1 challenges
      if (body.enrollments && body.enrollments.length > 0) {
        body.enrollments.forEach((enrollment: any) => {
          expect(enrollment.Challenge?.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);
        });
      }
    });

    test('manager queue only returns current workspace submissions', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.manager.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/manager/queue`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      // Verify workspaceId is correct
      expect(body.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);

      // Verify all submissions belong to workspace1
      if (body.submissions && body.submissions.length > 0) {
        body.submissions.forEach((submission: any) => {
          // Check via nested Challenge relation
          if (submission.Activity?.Challenge?.workspaceId) {
            expect(submission.Activity.Challenge.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);
          }
        });
      }
    });

    test('user list only returns current workspace users', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/users`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      if (body.users && body.users.length > 0) {
        // Verify users have WorkspaceMembership for workspace1 only
        for (const user of body.users) {
          const memberships = await prisma.workspaceMembership.findMany({
            where: { userId: user.id }
          });
          expect(memberships.some(m => m.workspaceId === TEST_WORKSPACES.workspace1.id)).toBe(true);
          expect(memberships.every(m => m.workspaceId === TEST_WORKSPACES.workspace1.id)).toBe(true);
        }
      }
    });
  });

  test.describe('5. Points/Rewards Isolation', () => {
    test('cannot view points balance for user in other workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/users/${TEST_WORKSPACES.workspace2.users.participant.id}/points`
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('cannot award points to user in other workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/points/award`,
        {
          data: {
            userId: TEST_WORKSPACES.workspace2.users.participant.id,
            points: 100,
            reason: 'Cross-workspace attempt'
          }
        }
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('leaderboard only shows users from current workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.participant.email,
        DEFAULT_PASSWORD
      );

      const response = await page.request.get(
        `/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/leaderboard`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      if (body.leaderboard && body.leaderboard.length > 0) {
        body.leaderboard.forEach((entry: any) => {
          expect(entry.workspaceId || entry.user?.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);
        });
      }
    });
  });

  test.describe('6. Role-Based Access Control Across Workspaces', () => {
    test('admin from workspace1 has no admin privileges in workspace2', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      // Try admin operations in workspace2
      const endpoints = [
        { method: 'GET', path: `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/settings` },
        { method: 'POST', path: `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/users/invite` },
        { method: 'DELETE', path: `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/users/${TEST_WORKSPACES.workspace2.users.participant.id}` }
      ];

      for (const endpoint of endpoints) {
        const response = await page.request.fetch(endpoint.path, { method: endpoint.method });
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('manager from workspace1 cannot manage workspace2 challenges', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.manager.email,
        DEFAULT_PASSWORD
      );

      const workspace2Challenge = await prisma.challenge.findFirst({
        where: { workspaceId: TEST_WORKSPACES.workspace2.id }
      });

      if (!workspace2Challenge) {
        test.skip();
        return;
      }

      // Try to assign self to workspace2 challenge
      const response = await page.request.post(
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/challenges/${workspace2Challenge.id}/managers`,
        {
          data: {
            userId: TEST_WORKSPACES.workspace1.users.manager.id
          }
        }
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('participant cannot access any resources from other workspace', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.participant.email,
        DEFAULT_PASSWORD
      );

      const endpoints = [
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/challenges`,
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/enrollments`,
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/leaderboard`,
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/activities`
      ];

      for (const endpoint of endpoints) {
        const response = await page.request.get(endpoint);
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });
  });

  test.describe('7. Middleware Protection', () => {
    test('middleware blocks access to other workspace routes at all levels', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      // Test various route patterns
      const routes = [
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/dashboard`,
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/admin/settings`,
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/manager/queue`,
        `/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/participant/challenges`
      ];

      for (const route of routes) {
        const response = await page.request.get(route);
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('cannot bypass workspace check with slug manipulation', async ({ page }) => {
      await loginWithCredentials(
        page,
        TEST_WORKSPACES.workspace1.users.admin.email,
        DEFAULT_PASSWORD
      );

      // Try various slug manipulation attempts
      const manipulatedSlugs = [
        `${TEST_WORKSPACES.workspace2.slug}`,
        `../../../${TEST_WORKSPACES.workspace2.slug}`,
        `${TEST_WORKSPACES.workspace2.slug}%00`,
        `${TEST_WORKSPACES.workspace2.slug}?workspace=${TEST_WORKSPACES.workspace1.slug}`
      ];

      for (const slug of manipulatedSlugs) {
        const response = await page.request.get(`/api/workspaces/${slug}/challenges`);
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });
  });

  test.describe('8. Database-Level RLS Verification', () => {
    test('RLS prevents cross-workspace data access at database level', async () => {
      // Create a Supabase client with workspace1 admin context
      const workspace1AdminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // Authenticate as workspace1 admin
      const { data: authData } = await workspace1AdminClient.auth.signInWithPassword({
        email: TEST_WORKSPACES.workspace1.users.admin.email,
        password: DEFAULT_PASSWORD
      });

      expect(authData.user).toBeTruthy();

      // Try to query workspace2 challenges - RLS should block at DB level
      const { data, error } = await workspace1AdminClient
        .from('Challenge')
        .select('*')
        .eq('workspaceId', TEST_WORKSPACES.workspace2.id);

      // RLS should either return empty results or an error
      expect(data?.length || 0).toBe(0);
    });
  });
});
