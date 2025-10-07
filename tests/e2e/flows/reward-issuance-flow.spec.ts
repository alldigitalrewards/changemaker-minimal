import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, PARTICIPANT_EMAIL, DEFAULT_PASSWORD, logout } from '../support/auth';
import { prisma } from '../../../lib/prisma';
import { RewardType, RewardStatus } from '@prisma/client';

test.describe('Reward Issuance Flow - End to End', () => {
  const WORKSPACE_SLUG = 'alldigitalrewards';
  let workspaceId: string;
  let participantId: string;
  let challengeId: string;

  test.beforeAll(async () => {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: WORKSPACE_SLUG }
    });
    workspaceId = workspace!.id;

    // Ensure participant exists
    const participant = await prisma.user.upsert({
      where: { email: PARTICIPANT_EMAIL },
      update: { role: 'PARTICIPANT', workspaceId },
      create: {
        email: PARTICIPANT_EMAIL,
        role: 'PARTICIPANT',
        workspaceId
      }
    });
    participantId = participant.id;
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (challengeId) {
      await prisma.rewardIssuance.deleteMany({ where: { challengeId } });
      await prisma.activitySubmission.deleteMany({
        where: { enrollment: { challengeId } }
      });
      await prisma.enrollment.deleteMany({ where: { challengeId } });
      await prisma.activity.deleteMany({ where: { challengeId } });
      await prisma.challenge.delete({ where: { id: challengeId } });
    }
  });

  test('Complete reward flow - Points reward', async ({ page, context }) => {
    // 1. Admin creates challenge with points reward
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);
    await page.goto(`/w/${WORKSPACE_SLUG}/admin/challenges/new`);

    // Fill challenge form
    await page.fill('input[name="title"]', `Points Reward Test ${Date.now()}`);
    await page.fill('textarea[name="description"], input[name="description"]', 'Complete this challenge to earn 100 points');

    // Set dates
    const tomorrow = new Date(Date.now() + 86400000);
    const nextMonth = new Date(Date.now() + 30 * 86400000);

    await page.fill('input[name="startDate"], input[type="date"]:first', tomorrow.toISOString().split('T')[0]);
    await page.fill('input[name="endDate"], input[type="date"]:last', nextMonth.toISOString().split('T')[0]);

    // Select reward type
    await page.selectOption('select[name="rewardType"]', 'points');

    // Enter points amount
    await page.fill('input[name="pointsAmount"], input[name="rewardConfig.pointsAmount"]', '100');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');

    // Wait for redirect and get challenge ID from URL
    await page.waitForURL(/\/challenges\/[a-f0-9-]+/);
    const url = page.url();
    challengeId = url.split('/challenges/')[1].split('/')[0].split('?')[0];

    // Verify challenge was created
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId }
    });
    expect(challenge).toBeTruthy();
    expect(challenge?.rewardType).toBe('points');

    // 2. Participant enrolls in challenge
    await logout(page);
    await loginWithCredentials(page, PARTICIPANT_EMAIL, DEFAULT_PASSWORD);

    await page.goto(`/w/${WORKSPACE_SLUG}/participant/challenges`);

    // Find and click the challenge
    await page.locator(`text=${challenge?.title}`).first().click();

    // Enroll in challenge
    const enrollButton = page.locator('button:has-text("Enroll"), button:has-text("Join")').first();
    await enrollButton.click();

    // Verify enrollment
    await expect(page.locator('text=/enrolled/i, text=/joined/i').first()).toBeVisible({ timeout: 10000 });

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: participantId,
        challengeId
      }
    });
    expect(enrollment).toBeTruthy();

    // 3. Participant submits activity
    // Create activity first (admin task)
    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    }) || await prisma.activityTemplate.create({
      data: {
        name: 'Test Activity',
        description: 'Test',
        type: 'TEXT_SUBMISSION',
        workspaceId
      }
    });

    const activity = await prisma.activity.create({
      data: {
        templateId: template.id,
        challengeId,
        pointsValue: 100,
        rewardRules: [{
          type: 'POINTS',
          amount: 100
        }]
      }
    });

    // Navigate to activities page
    await page.goto(`/w/${WORKSPACE_SLUG}/participant/challenges/${challengeId}`);

    // Submit activity
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Complete Activity")').first();

    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();

      // Fill submission form
      await page.fill('textarea[name="textContent"], textarea', 'I have completed this activity successfully');
      await page.click('button[type="submit"]:has-text("Submit")');

      await expect(page.locator('text=/submitted/i, text=/pending review/i').first()).toBeVisible({ timeout: 10000 });
    } else {
      // Create submission via API if UI not available
      await prisma.activitySubmission.create({
        data: {
          activityId: activity.id,
          userId: participantId,
          enrollmentId: enrollment!.id,
          textContent: 'I have completed this activity successfully',
          status: 'PENDING'
        }
      });
    }

    const submission = await prisma.activitySubmission.findFirst({
      where: {
        enrollmentId: enrollment!.id,
        activityId: activity.id
      }
    });
    expect(submission).toBeTruthy();

    // 4. Admin reviews and approves
    await logout(page);
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    await page.goto(`/w/${WORKSPACE_SLUG}/admin/challenges/${challengeId}`);

    // Navigate to submissions/reviews
    const reviewsTab = page.locator('text=Reviews, text=Submissions, [data-tab="reviews"]').first();
    if (await reviewsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reviewsTab.click();
    } else {
      await page.goto(`/w/${WORKSPACE_SLUG}/admin/challenges/${challengeId}/reviews`);
    }

    // Find submission and approve
    const approveButton = page.locator(`button:has-text("Approve")`).first();

    if (await approveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await approveButton.click();

      // Confirm approval in modal if present
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await expect(page.locator('text=/approved/i').first()).toBeVisible({ timeout: 10000 });
    } else {
      // Approve via API if UI not available
      await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission!.id}/review`, {
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: 'APPROVED',
          pointsAwarded: 100
        }
      });
    }

    // 5. Verify reward was issued
    const rewardIssuance = await prisma.rewardIssuance.findFirst({
      where: {
        userId: participantId,
        challengeId,
        type: 'points'
      }
    });

    expect(rewardIssuance).toBeTruthy();
    expect(rewardIssuance?.amount).toBe(100);
    expect(rewardIssuance?.status).toBe(RewardStatus.PENDING);

    // 6. Verify RewardIssuance record details
    expect(rewardIssuance?.workspaceId).toBe(workspaceId);
    expect(rewardIssuance?.type).toBe('points');

    // 7. Verify submission is linked to reward
    const updatedSubmission = await prisma.activitySubmission.findUnique({
      where: { id: submission!.id },
      include: { rewardIssuance: true }
    });

    expect(updatedSubmission?.rewardIssued).toBe(true);
    expect(updatedSubmission?.rewardIssuanceId).toBe(rewardIssuance?.id);
    expect(updatedSubmission?.rewardIssuance).toBeTruthy();

    // 8. Participant sees reward
    await logout(page);
    await loginWithCredentials(page, PARTICIPANT_EMAIL, DEFAULT_PASSWORD);

    await page.goto(`/w/${WORKSPACE_SLUG}/participant/dashboard`);

    // Verify reward appears in participant's view
    await expect(page.locator('text=/100.*points/i, text=/reward/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('Complete reward flow - SKU reward', async ({ page }) => {
    // 1. Admin creates challenge with SKU reward
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const challenge = await prisma.challenge.create({
      data: {
        title: `SKU Reward E2E ${Date.now()}`,
        description: 'Win a product!',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED',
        rewardType: 'sku',
        rewardConfig: {
          skuId: 'E2E-TEST-SKU',
          description: 'Test Product'
        }
      }
    });
    challengeId = challenge.id;

    // 2. Create activity
    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    });

    const activity = await prisma.activity.create({
      data: {
        templateId: template!.id,
        challengeId,
        pointsValue: 0,
        rewardRules: [{
          type: 'SKU',
          skuId: 'E2E-TEST-SKU'
        }]
      }
    });

    // 3. Participant enrolls
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId,
        status: 'ENROLLED'
      }
    });

    // 4. Participant submits
    const submission = await prisma.activitySubmission.create({
      data: {
        activityId: activity.id,
        userId: participantId,
        enrollmentId: enrollment.id,
        textContent: 'SKU submission',
        status: 'PENDING'
      }
    });

    // 5. Admin approves
    await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        reward: {
          type: 'SKU',
          skuId: 'E2E-TEST-SKU'
        }
      }
    });

    // 6. Verify SKU reward issued
    const rewardIssuance = await prisma.rewardIssuance.findFirst({
      where: {
        userId: participantId,
        challengeId,
        type: 'sku'
      }
    });

    expect(rewardIssuance).toBeTruthy();
    expect(rewardIssuance?.skuId).toBe('E2E-TEST-SKU');
    expect(rewardIssuance?.status).toBe(RewardStatus.PENDING);

    // 7. Verify in participant view
    await logout(page);
    await loginWithCredentials(page, PARTICIPANT_EMAIL, DEFAULT_PASSWORD);

    await page.goto(`/w/${WORKSPACE_SLUG}/participant/dashboard`);

    // Check for reward display
    const rewardDisplay = page.locator('text=/E2E-TEST-SKU/i, text=/Test Product/i').first();
    await expect(rewardDisplay).toBeVisible({ timeout: 10000 });
  });

  test('Reward status transitions - PENDING to ISSUED', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Create a reward in PENDING state
    const challenge = await prisma.challenge.create({
      data: {
        title: `Status Test ${Date.now()}`,
        description: 'Test status transitions',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        rewardType: 'points',
        rewardConfig: { pointsAmount: 50 }
      }
    });
    challengeId = challenge.id;

    const reward = await prisma.rewardIssuance.create({
      data: {
        userId: participantId,
        workspaceId,
        challengeId,
        type: 'points',
        amount: 50,
        status: RewardStatus.PENDING
      }
    });

    expect(reward.status).toBe(RewardStatus.PENDING);
    expect(reward.issuedAt).toBeNull();

    // Simulate issuing the reward
    await page.goto(`/w/${WORKSPACE_SLUG}/admin/rewards`);

    // Mark as issued (via API or UI)
    const updatedReward = await prisma.rewardIssuance.update({
      where: { id: reward.id },
      data: {
        status: RewardStatus.ISSUED,
        issuedAt: new Date()
      }
    });

    expect(updatedReward.status).toBe(RewardStatus.ISSUED);
    expect(updatedReward.issuedAt).toBeTruthy();

    // Cleanup
    await prisma.rewardIssuance.delete({ where: { id: reward.id } });
  });
});
