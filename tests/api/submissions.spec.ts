import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, PARTICIPANT_EMAIL, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';
import { SubmissionStatus, RewardType, RewardStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

test.describe('Submissions and Review API', () => {
  const WORKSPACE_SLUG = 'alldigitalrewards';
  let workspaceId: string;
  let participantId: string;
  let adminId: string;
  let challengeId: string;
  let activityId: string;
  let enrollmentId: string;

  test.beforeAll(async () => {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: WORKSPACE_SLUG }
    });
    workspaceId = workspace!.id;

    const admin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });
    adminId = admin!.id;

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

    // Create test challenge
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Submission Test Challenge ${Date.now()}`,
        description: 'Test challenge for submissions',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED',
        rewardType: 'points',
        rewardConfig: {
          pointsAmount: 100
        }
      }
    });
    challengeId = challenge.id;

    // Create activity
    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    }) || await prisma.activityTemplate.create({
      data: {
        id: randomUUID(),
        name: 'Test Activity Template',
        description: 'For testing',
        type: 'TEXT_SUBMISSION',
        workspaceId
      }
    });

    const activity = await prisma.activity.create({
      data: {
        id: randomUUID(),
        templateId: template.id,
        challengeId: challenge.id,
        pointsValue: 50,
        rewardRules: [{
          type: 'POINTS',
          amount: 50
        }]
      }
    });
    activityId = activity.id;

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId: challenge.id,
        status: 'ENROLLED'
      }
    });
    enrollmentId = enrollment.id;
  });

  test.afterAll(async () => {
    // Cleanup
    await prisma.activitySubmission.deleteMany({ where: { enrollmentId } });
    await prisma.enrollment.delete({ where: { id: enrollmentId } });
    await prisma.activity.delete({ where: { id: activityId } });
    await prisma.challenge.delete({ where: { id: challengeId } });
  });

  test('POST /api/workspaces/[slug]/submissions/[id]/review - approve submission', async ({ page }) => {
    // Login as admin
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Create submission
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission for approval',
        status: SubmissionStatus.PENDING
      }
    });

    // Admin approves
    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        pointsAwarded: 50,
        reviewNotes: 'Great work!'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.submission.status).toBe(SubmissionStatus.APPROVED);
    expect(data.submission.pointsAwarded).toBe(50);
    expect(data.submission.reviewNotes).toBe('Great work!');
    expect(data.submission.reviewedBy).toBeTruthy();
    expect(data.submission.reviewedAt).toBeTruthy();

    // Cleanup
    await prisma.rewardIssuance.deleteMany({ where: { userId: participantId, challengeId } });
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('POST /api/workspaces/[slug]/submissions/[id]/review - reject submission', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission for rejection',
        status: SubmissionStatus.PENDING
      }
    });

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'REJECTED',
        reviewNotes: 'Does not meet requirements'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.submission.status).toBe(SubmissionStatus.REJECTED);
    expect(data.submission.pointsAwarded).toBeNull();
    expect(data.submission.reviewNotes).toBe('Does not meet requirements');

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('POST /api/workspaces/[slug]/submissions/[id]/review - trigger reward issuance on approval', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Test submission for reward',
        status: SubmissionStatus.PENDING
      }
    });

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        pointsAwarded: 50
      }
    });

    expect(response.status()).toBe(200);

    // Verify reward issuance was created
    const rewardIssuance = await prisma.rewardIssuance.findFirst({
      where: {
        userId: participantId,
        challengeId,
        type: 'points'
      },
      orderBy: { issuedAt: 'desc' }
    });

    expect(rewardIssuance).toBeTruthy();
    expect(rewardIssuance?.amount).toBe(50);
    expect(rewardIssuance?.status).toBe(RewardStatus.PENDING);

    // Cleanup
    await prisma.rewardIssuance.deleteMany({ where: { challengeId } });
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('POST /api/workspaces/[slug]/submissions/[id]/review - verify RewardIssuance created', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Reward verification test',
        status: SubmissionStatus.PENDING
      }
    });

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        pointsAwarded: 50
      }
    });

    expect(response.status()).toBe(200);

    // Get the updated submission with reward
    const updatedSubmission = await prisma.activitySubmission.findUnique({
      where: { id: submission.id },
      include: { RewardIssuance: true }
    });

    expect(updatedSubmission?.rewardIssued).toBe(true);
    expect(updatedSubmission?.rewardIssuanceId).toBeTruthy();
    expect(updatedSubmission?.RewardIssuance).toBeTruthy();
    expect(updatedSubmission?.RewardIssuance?.type).toBe('points');
    expect(updatedSubmission?.RewardIssuance?.amount).toBe(50);

    // Cleanup
    await prisma.rewardIssuance.deleteMany({ where: { challengeId } });
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('POST /api/workspaces/[slug]/submissions/[id]/review - SKU reward on approval', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    // Create SKU-based challenge and activity
    const skuChallenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `SKU Challenge ${Date.now()}`,
        description: 'SKU reward test',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED',
        rewardType: 'sku',
        rewardConfig: {
          skuId: 'TEST-SKU-001'
        }
      }
    });

    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    });

    const skuActivity = await prisma.activity.create({
      data: {
        id: randomUUID(),
        templateId: template!.id,
        challengeId: skuChallenge.id,
        pointsValue: 0,
        rewardRules: [{
          type: 'SKU',
          skuId: 'TEST-SKU-001'
        }]
      }
    });

    const skuEnrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId: skuChallenge.id,
        status: 'ENROLLED'
      }
    });

    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId: skuActivity.id,
        userId: participantId,
        enrollmentId: skuEnrollment.id,
        textContent: 'SKU reward submission',
        status: SubmissionStatus.PENDING
      }
    });

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        reward: {
          type: 'sku',
          skuId: 'TEST-SKU-001'
        }
      }
    });

    expect(response.status()).toBe(200);

    // Verify SKU reward issuance
    const rewardIssuance = await prisma.rewardIssuance.findFirst({
      where: {
        userId: participantId,
        challengeId: skuChallenge.id,
        type: 'sku'
      }
    });

    expect(rewardIssuance).toBeTruthy();
    expect(rewardIssuance?.skuId).toBe('TEST-SKU-001');
    expect(rewardIssuance?.status).toBe(RewardStatus.PENDING);

    // Cleanup
    await prisma.rewardIssuance.deleteMany({ where: { challengeId: skuChallenge.id } });
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
    await prisma.enrollment.delete({ where: { id: skuEnrollment.id } });
    await prisma.activity.delete({ where: { id: skuActivity.id } });
    await prisma.challenge.delete({ where: { id: skuChallenge.id } });
  });

  test('POST /api/workspaces/[slug]/submissions/[id]/review - monetary reward', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const monetaryChallenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Monetary Challenge ${Date.now()}`,
        description: 'Monetary reward test',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED',
        rewardType: 'monetary',
        rewardConfig: {
          amount: 5000,
          currency: 'USD'
        }
      }
    });

    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    });

    const monetaryActivity = await prisma.activity.create({
      data: {
        id: randomUUID(),
        templateId: template!.id,
        challengeId: monetaryChallenge.id,
        pointsValue: 0,
        rewardRules: [{
          type: 'MONETARY',
          amount: 5000,
          currency: 'USD'
        }]
      }
    });

    const monetaryEnrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId: monetaryChallenge.id,
        status: 'ENROLLED'
      }
    });

    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId: monetaryActivity.id,
        userId: participantId,
        enrollmentId: monetaryEnrollment.id,
        textContent: 'Monetary reward submission',
        status: SubmissionStatus.PENDING
      }
    });

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        reward: {
          type: 'monetary',
          amount: 5000,
          currency: 'USD'
        }
      }
    });

    expect(response.status()).toBe(200);

    // Verify monetary reward issuance
    const rewardIssuance = await prisma.rewardIssuance.findFirst({
      where: {
        userId: participantId,
        challengeId: monetaryChallenge.id,
        type: 'monetary'
      }
    });

    expect(rewardIssuance).toBeTruthy();
    expect(rewardIssuance?.amount).toBe(5000);
    expect(rewardIssuance?.currency).toBe('USD');
    expect(rewardIssuance?.status).toBe(RewardStatus.PENDING);

    // Cleanup
    await prisma.rewardIssuance.deleteMany({ where: { challengeId: monetaryChallenge.id } });
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
    await prisma.enrollment.delete({ where: { id: monetaryEnrollment.id } });
    await prisma.activity.delete({ where: { id: monetaryActivity.id } });
    await prisma.challenge.delete({ where: { id: monetaryChallenge.id } });
  });

  test('POST /api/workspaces/[slug]/submissions/[id]/review - reject does not create reward', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Will be rejected',
        status: SubmissionStatus.PENDING
      }
    });

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'REJECTED',
        reviewNotes: 'Insufficient detail'
      }
    });

    expect(response.status()).toBe(200);

    // Verify NO reward issuance was created
    const rewardIssuance = await prisma.rewardIssuance.findFirst({
      where: {
        userId: participantId,
        challengeId
      },
      orderBy: { issuedAt: 'desc' }
    });

    // Should be null or from previous test
    const updatedSubmission = await prisma.activitySubmission.findUnique({
      where: { id: submission.id }
    });

    expect(updatedSubmission?.rewardIssued).toBe(false);
    expect(updatedSubmission?.rewardIssuanceId).toBeNull();

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('Review authorization - only admin can review', async ({ page }) => {
    // Login as participant
    await loginWithCredentials(page, PARTICIPANT_EMAIL, DEFAULT_PASSWORD);

    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Participant trying to review',
        status: SubmissionStatus.PENDING
      }
    });

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        pointsAwarded: 50
      }
    });

    expect(response.status()).toBe(403); // Forbidden

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });

  test('Review validation - cannot review already reviewed submission', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId,
        userId: participantId,
        enrollmentId,
        textContent: 'Already reviewed',
        status: SubmissionStatus.APPROVED,
        pointsAwarded: 50,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'REJECTED',
        reviewNotes: 'Trying to change review'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already reviewed');

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission.id } });
  });
});
