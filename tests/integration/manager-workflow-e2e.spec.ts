/**
 * End-to-End Manager Workflow Test
 *
 * This test verifies the complete manager workflow from challenge creation
 * through final approval with RLS policies enabled:
 *
 * 1. Admin creates challenge and assigns manager
 * 2. Participant enrolls and submits to assigned challenge
 * 3. Manager reviews and approves submission (PENDING → MANAGER_APPROVED)
 * 4. Admin performs final approval (MANAGER_APPROVED → APPROVED)
 * 5. Points are awarded to participant
 * 6. ActivityEvent tracking verified throughout
 *
 * This test ensures workspace isolation and manager assignment enforcement
 * work correctly in a realistic end-to-end scenario with RLS active.
 */

import { test, expect } from '@playwright/test';
import { TEST_WORKSPACES, createTestWorkspaces, cleanupTestData } from '../fixtures/rls-test-data';
import { createServiceRoleClient } from '../utils/supabase-auth-test';
import { loginWithCredentials, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';

test.describe('Manager Workflow End-to-End', () => {
  test.beforeAll(async () => {
    const serviceClient = createServiceRoleClient();
    await cleanupTestData(serviceClient);
    await createTestWorkspaces(serviceClient);
  });

  test.afterAll(async () => {
    const serviceClient = createServiceRoleClient();
    await cleanupTestData(serviceClient);
  });

  test('complete manager workflow: create → assign → submit → manager approve → admin approve → points awarded', async ({ page, browser }) => {
    // ====================================================================
    // STEP 1: Admin creates challenge and assigns manager
    // ====================================================================
    await loginWithCredentials(page, TEST_WORKSPACES.workspace1.users.admin.email, DEFAULT_PASSWORD);

    // Create a new challenge
    const challengeId = randomUUID();
    const challenge = await prisma.challenge.create({
      data: {
        id: challengeId,
        workspaceId: TEST_WORKSPACES.workspace1.id,
        title: 'E2E Test Challenge',
        description: 'Test challenge for end-to-end workflow',
        status: 'PUBLISHED',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Create activity for challenge
    const activityId = randomUUID();
    await prisma.activity.create({
      data: {
        id: activityId,
        challengeId: challenge.id,
        templateId: TEST_WORKSPACES.workspace1.activityTemplate.id,
        pointsValue: 100, // E2E test points
      },
    });

    // Assign manager to challenge
    const assignResponse = await page.request.post(
      `http://localhost:3000/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/challenges/${challenge.id}/managers`,
      {
        data: {
          managerId: TEST_WORKSPACES.workspace1.users.manager.id,
        },
      }
    );
    expect(assignResponse.ok()).toBeTruthy();

    const assignmentData = await assignResponse.json();
    expect(assignmentData.assignment).toBeDefined();
    expect(assignmentData.assignment.managerId).toBe(TEST_WORKSPACES.workspace1.users.manager.id);
    expect(assignmentData.assignment.challengeId).toBe(challenge.id);

    console.log('✅ Step 1: Challenge created and manager assigned');

    // ====================================================================
    // STEP 2: Participant enrolls and submits to assigned challenge
    // ====================================================================
    const participantContext = await browser.newContext();
    const participantPage = await participantContext.newPage();
    await loginWithCredentials(participantPage, TEST_WORKSPACES.workspace1.users.participant1.email, DEFAULT_PASSWORD);

    // Enroll in challenge
    const enrollmentId = randomUUID();
    await prisma.enrollment.create({
      data: {
        id: enrollmentId,
        userId: TEST_WORKSPACES.workspace1.users.participant1.id,
        challengeId: challenge.id,
        status: 'ACTIVE',
      },
    });

    // Submit activity
    const submissionId = randomUUID();
    await prisma.activitySubmission.create({
      data: {
        id: submissionId,
        activityId: activityId,
        userId: TEST_WORKSPACES.workspace1.users.participant1.id,
        enrollmentId: enrollmentId,
        status: 'PENDING',
        submittedAt: new Date(),
        contentText: 'E2E test submission content',
      },
    });

    console.log('✅ Step 2: Participant enrolled and submitted');

    // ====================================================================
    // STEP 3: Manager reviews and approves submission
    // ====================================================================
    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    await loginWithCredentials(managerPage, TEST_WORKSPACES.workspace1.users.manager.email, DEFAULT_PASSWORD);

    // Verify manager sees submission in queue
    const queueResponse = await managerPage.request.get(
      `http://localhost:3000/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/manager/queue?status=PENDING`
    );
    expect(queueResponse.ok()).toBeTruthy();

    const queueData = await queueResponse.json();
    expect(queueData.submissions).toBeDefined();
    expect(queueData.submissions.length).toBeGreaterThan(0);

    const foundSubmission = queueData.submissions.find((s: any) => s.id === submissionId);
    expect(foundSubmission).toBeDefined();
    expect(foundSubmission.status).toBe('PENDING');

    // Manager approves submission
    const managerReviewResponse = await managerPage.request.post(
      `http://localhost:3000/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/submissions/${submissionId}/manager-review`,
      {
        data: {
          status: 'MANAGER_APPROVED',
          reviewNotes: 'E2E test: Manager approved',
        },
      }
    );
    expect(managerReviewResponse.ok()).toBeTruthy();

    const reviewData = await managerReviewResponse.json();
    expect(reviewData.submission).toBeDefined();
    expect(reviewData.submission.status).toBe('MANAGER_APPROVED');
    expect(reviewData.submission.managerReviewNotes).toBe('E2E test: Manager approved');

    // Verify ActivityEvent for manager approval
    const managerEvent = await prisma.activityEvent.findFirst({
      where: {
        submissionId: submissionId,
        type: 'SUBMISSION_MANAGER_APPROVED',
        actorUserId: TEST_WORKSPACES.workspace1.users.manager.id,
      },
    });
    expect(managerEvent).toBeDefined();
    expect(managerEvent?.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);

    console.log('✅ Step 3: Manager approved submission (PENDING → MANAGER_APPROVED)');

    // ====================================================================
    // STEP 4: Admin performs final approval
    // ====================================================================
    // Admin approves the manager-approved submission
    const adminApproveResponse = await page.request.post(
      `http://localhost:3000/api/workspaces/${TEST_WORKSPACES.workspace1.slug}/submissions/${submissionId}/admin-review`,
      {
        data: {
          action: 'approve',
          notes: 'E2E test: Admin final approval',
        },
      }
    );
    expect(adminApproveResponse.ok()).toBeTruthy();

    const adminData = await adminApproveResponse.json();
    expect(adminData.submission).toBeDefined();
    expect(adminData.submission.status).toBe('APPROVED');

    // Verify ActivityEvent for admin override
    const adminEvent = await prisma.activityEvent.findFirst({
      where: {
        submissionId: submissionId,
        type: 'SUBMISSION_APPROVED',
        actorUserId: TEST_WORKSPACES.workspace1.users.admin.id,
      },
    });
    expect(adminEvent).toBeDefined();
    expect(adminEvent?.workspaceId).toBe(TEST_WORKSPACES.workspace1.id);
    expect(adminEvent?.metadata).toBeDefined();

    console.log('✅ Step 4: Admin approved submission (MANAGER_APPROVED → APPROVED)');

    // ====================================================================
    // STEP 5: Verify points are awarded
    // ====================================================================
    const updatedSubmission = await prisma.activitySubmission.findUnique({
      where: { id: submissionId },
      include: {
        Activity: {
          include: {
            ActivityTemplate: true,
          },
        },
      },
    });

    expect(updatedSubmission).toBeDefined();
    expect(updatedSubmission?.status).toBe('APPROVED');
    expect(updatedSubmission?.pointsAwarded).toBeGreaterThan(0);

    // Verify participant's total points increased
    const participant = await prisma.user.findUnique({
      where: { id: TEST_WORKSPACES.workspace1.users.participant1.id },
    });
    expect(participant).toBeDefined();
    expect(participant?.points).toBeGreaterThanOrEqual(updatedSubmission!.pointsAwarded);

    console.log('✅ Step 5: Points awarded to participant');

    // ====================================================================
    // STEP 6: Verify workspace isolation throughout workflow
    // ====================================================================
    // Create a manager from workspace2 context
    const workspace2ManagerContext = await browser.newContext();
    const workspace2ManagerPage = await workspace2ManagerContext.newPage();
    await loginWithCredentials(workspace2ManagerPage, TEST_WORKSPACES.workspace2.users.manager.email, DEFAULT_PASSWORD);

    // Verify workspace2 manager cannot see workspace1 submissions
    const workspace2QueueResponse = await workspace2ManagerPage.request.get(
      `http://localhost:3000/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/manager/queue`
    );
    expect(workspace2QueueResponse.ok()).toBeTruthy();

    const workspace2QueueData = await workspace2QueueResponse.json();
    const workspace1Submission = workspace2QueueData.submissions.find((s: any) => s.id === submissionId);
    expect(workspace1Submission).toBeUndefined();

    // Verify workspace2 manager cannot review workspace1 submissions
    const crossWorkspaceReviewResponse = await workspace2ManagerPage.request.post(
      `http://localhost:3000/api/workspaces/${TEST_WORKSPACES.workspace2.slug}/submissions/${submissionId}/manager-review`,
      {
        data: {
          status: 'MANAGER_APPROVED',
          reviewNotes: 'Should not work',
        },
      }
    );
    expect(crossWorkspaceReviewResponse.ok()).toBeFalsy();
    expect(crossWorkspaceReviewResponse.status()).toBe(404);

    console.log('✅ Step 6: Workspace isolation verified');

    // Cleanup contexts
    await participantContext.close();
    await managerContext.close();
    await workspace2ManagerContext.close();

    // Final cleanup: remove test challenge
    await prisma.activitySubmission.delete({ where: { id: submissionId } });
    await prisma.enrollment.delete({ where: { id: enrollmentId } });
    await prisma.challengeAssignment.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.activityEvent.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.activity.delete({ where: { id: activityId } });
    await prisma.challenge.delete({ where: { id: challenge.id } });

    console.log('✅ End-to-end manager workflow completed successfully!');
  });
});
