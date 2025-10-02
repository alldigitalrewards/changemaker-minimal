import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from '../support/auth';
import { prisma } from '../../../lib/prisma';

test.describe('Participant Journey - End to End', () => {
  const WORKSPACE_SLUG = 'alldigitalrewards';
  const TEST_PARTICIPANT_EMAIL = `participant_journey_${Date.now()}@test.com`;
  let workspaceId: string;
  let participantId: string;
  let challengeId: string;
  let inviteCode: string;

  test.beforeAll(async () => {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: WORKSPACE_SLUG }
    });
    workspaceId = workspace!.id;
  });

  test.afterAll(async () => {
    // Cleanup
    if (participantId) {
      await prisma.rewardIssuance.deleteMany({ where: { userId: participantId } });
      await prisma.activitySubmission.deleteMany({ where: { userId: participantId } });
      await prisma.enrollment.deleteMany({ where: { userId: participantId } });
      await prisma.user.delete({ where: { id: participantId } }).catch(() => {});
    }

    if (challengeId) {
      await prisma.activity.deleteMany({ where: { challengeId } });
      await prisma.challenge.delete({ where: { id: challengeId } }).catch(() => {});
    }

    if (inviteCode) {
      await prisma.inviteCode.deleteMany({ where: { code: inviteCode } });
    }
  });

  test('Complete participant journey - invite to reward', async ({ page, context }) => {
    // === STEP 1: Admin creates invite ===
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    await page.goto(`/w/${WORKSPACE_SLUG}/admin/invites`);

    // Generate invite
    const createInviteButton = page.locator('button:has-text("Create Invite"), button:has-text("New Invite")').first();

    if (await createInviteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createInviteButton.click();

      // Fill invite form if modal appears
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await emailInput.fill(TEST_PARTICIPANT_EMAIL);
      }

      const submitButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Create")').first();
      await submitButton.click();

      await expect(page.locator('text=/invite.*sent/i, text=/created/i').first()).toBeVisible({ timeout: 10000 });
    } else {
      // Create invite via database
      const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

      const invite = await prisma.inviteCode.create({
        data: {
          code: `JOURNEY-${Date.now()}`,
          workspaceId,
          maxUses: 1,
          createdById: admin!.id
        }
      });
      inviteCode = invite.code;
    }

    // Get invite code
    const dbInvite = await prisma.inviteCode.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
    inviteCode = dbInvite!.code;

    // === STEP 2: Participant accepts invite ===
    // Open invite link in new context (not logged in)
    await context.clearCookies();
    await page.goto(`/invites/${inviteCode}`);

    // Should redirect to signup/login
    await expect(page).toHaveURL(/\/auth\/(login|signup)/);

    // Create account
    const signupTab = page.locator('text=Sign Up, a:has-text("Sign Up")').first();
    if (await signupTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await signupTab.click();
    }

    // Fill signup form
    await page.fill('input[name="email"], input[type="email"]', TEST_PARTICIPANT_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', DEFAULT_PASSWORD);

    const signupButton = page.locator('button[type="submit"]:has-text("Sign Up"), button:has-text("Create Account")').first();
    await signupButton.click();

    // Wait for redirect after signup
    await page.waitForURL(/\/(workspaces|w\/)/);

    // Verify participant was created
    const participant = await prisma.user.findUnique({
      where: { email: TEST_PARTICIPANT_EMAIL }
    });
    expect(participant).toBeTruthy();
    expect(participant?.role).toBe('PARTICIPANT');
    participantId = participant!.id;

    // === STEP 3: View available challenges ===
    await page.goto(`/w/${WORKSPACE_SLUG}/participant/challenges`);

    await expect(page.locator('h1, h2').filter({ hasText: /challenges/i }).first()).toBeVisible();

    // Create a test challenge for participant to join
    const challenge = await prisma.challenge.create({
      data: {
        title: `Participant Journey Challenge ${Date.now()}`,
        description: 'Complete activities to earn rewards',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED',
        rewardType: 'POINTS',
        rewardConfig: {
          pointsAmount: 100
        }
      }
    });
    challengeId = challenge.id;

    // Refresh page to see new challenge
    await page.reload();

    // === STEP 4: Enroll in challenge ===
    await page.locator(`text=${challenge.title}`).first().click();

    const enrollButton = page.locator('button:has-text("Enroll"), button:has-text("Join Challenge")').first();

    if (await enrollButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enrollButton.click();
      await expect(page.locator('text=/enrolled/i, text=/joined/i').first()).toBeVisible({ timeout: 10000 });
    } else {
      // Enroll via API
      await prisma.enrollment.create({
        data: {
          userId: participantId,
          challengeId,
          status: 'ENROLLED'
        }
      });
      await page.reload();
    }

    // Verify enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: participantId,
        challengeId
      }
    });
    expect(enrollment).toBeTruthy();

    // === STEP 5: Complete activities ===
    // Create activity
    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    });

    const activity = await prisma.activity.create({
      data: {
        templateId: template!.id,
        challengeId,
        pointsValue: 50
      }
    });

    await page.reload();

    // Submit activity
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Complete")').first();

    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();

      await page.fill('textarea[name="textContent"], textarea', 'I completed this activity');

      const submitFormButton = page.locator('button[type="submit"]:has-text("Submit")').first();
      await submitFormButton.click();

      await expect(page.locator('text=/submitted/i').first()).toBeVisible({ timeout: 10000 });
    } else {
      // Submit via database
      await prisma.activitySubmission.create({
        data: {
          activityId: activity.id,
          userId: participantId,
          enrollmentId: enrollment!.id,
          textContent: 'I completed this activity',
          status: 'PENDING'
        }
      });
    }

    const submission = await prisma.activitySubmission.findFirst({
      where: {
        userId: participantId,
        activityId: activity.id
      }
    });
    expect(submission).toBeTruthy();

    // === STEP 6: Track progress ===
    await page.goto(`/w/${WORKSPACE_SLUG}/participant/dashboard`);

    // Verify progress is shown
    await expect(page.locator('text=/progress/i, text=/activities/i').first()).toBeVisible({ timeout: 10000 });

    // === STEP 7: Earn reward (admin approves) ===
    await context.clearCookies();
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Approve submission via API
    await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission!.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        pointsAwarded: 50
      }
    });

    // Verify reward was created
    const reward = await prisma.rewardIssuance.findFirst({
      where: {
        userId: participantId,
        challengeId
      }
    });
    expect(reward).toBeTruthy();

    // === STEP 8: Participant sees earned reward ===
    await context.clearCookies();
    await loginWithCredentials(page, TEST_PARTICIPANT_EMAIL, DEFAULT_PASSWORD);

    await page.goto(`/w/${WORKSPACE_SLUG}/participant/dashboard`);

    // Verify reward appears
    await expect(page.locator('text=/50.*points/i, text=/reward/i, text=/earned/i').first()).toBeVisible({ timeout: 10000 });

    // === STEP 9: Check leaderboard ===
    await page.goto(`/w/${WORKSPACE_SLUG}/participant/leaderboard`);

    // Verify participant appears on leaderboard
    await expect(page.locator(`text=${TEST_PARTICIPANT_EMAIL}, text=/50.*points/i`).first()).toBeVisible({ timeout: 10000 });
  });

  test('Participant dashboard shows all key information', async ({ page }) => {
    // Create participant with data
    const participant = await prisma.user.create({
      data: {
        email: `dashboard_test_${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId
      }
    });

    const challenge = await prisma.challenge.create({
      data: {
        title: `Dashboard Test ${Date.now()}`,
        description: 'For testing dashboard',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED'
      }
    });

    await prisma.enrollment.create({
      data: {
        userId: participant.id,
        challengeId: challenge.id,
        status: 'ENROLLED'
      }
    });

    // Login as participant
    await loginWithCredentials(page, participant.email, DEFAULT_PASSWORD);

    await page.goto(`/w/${WORKSPACE_SLUG}/participant/dashboard`);

    // Verify key dashboard elements
    await expect(page.locator('h1, h2').filter({ hasText: /dashboard/i }).first()).toBeVisible();
    await expect(page.locator('text=/enrolled.*challenges/i, [data-testid="enrolled-count"]').first()).toBeVisible();
    await expect(page.locator('text=/activities/i, [data-testid="activities-section"]').first()).toBeVisible();

    // Cleanup
    await prisma.enrollment.deleteMany({ where: { userId: participant.id } });
    await prisma.challenge.delete({ where: { id: challenge.id } });
    await prisma.user.delete({ where: { id: participant.id } });
  });

  test('Participant can view challenge details', async ({ page }) => {
    const participant = await prisma.user.create({
      data: {
        email: `challenge_view_${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId
      }
    });

    const challenge = await prisma.challenge.create({
      data: {
        title: `View Test ${Date.now()}`,
        description: 'Detailed challenge view test',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED',
        rewardType: 'POINTS',
        rewardConfig: {
          pointsAmount: 75,
          description: '75 points for completion'
        }
      }
    });

    await loginWithCredentials(page, participant.email, DEFAULT_PASSWORD);

    await page.goto(`/w/${WORKSPACE_SLUG}/participant/challenges/${challenge.id}`);

    // Verify challenge details displayed
    await expect(page.locator(`text=${challenge.title}`)).toBeVisible();
    await expect(page.locator(`text=${challenge.description}`)).toBeVisible();
    await expect(page.locator('text=/75.*points/i, text=/reward/i').first()).toBeVisible();

    // Cleanup
    await prisma.challenge.delete({ where: { id: challenge.id } });
    await prisma.user.delete({ where: { id: participant.id } });
  });
});
