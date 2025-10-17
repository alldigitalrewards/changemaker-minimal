import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, PARTICIPANT_EMAIL, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';
import { RewardType, RewardStatus, SubmissionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

test.describe('Multi-Reward System API', () => {
  const WORKSPACE_SLUG = 'alldigitalrewards';
  let workspaceId: string;
  let participantId: string;
  let adminUserId: string;

  test.beforeAll(async () => {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: WORKSPACE_SLUG }
    });
    workspaceId = workspace!.id;

    const adminUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });
    adminUserId = adminUser!.id;

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

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);
  });

  test('POST /api/workspaces/[slug]/challenges - create challenge with points reward', async ({ page }) => {
    const challengeData = {
      title: `Points Challenge ${Date.now()}`,
      description: 'Test challenge with points reward',
      startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days
      rewardType: 'points',
      rewardConfig: {
        pointsAmount: 100,
        description: '100 points for completion'
      }
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/challenges`, {
      headers: { 'Content-Type': 'application/json' },
      data: challengeData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.challenge.rewardType).toBe('points');
    expect(data.challenge.rewardConfig).toBeTruthy();
    expect(data.challenge.rewardConfig.pointsAmount).toBe(100);

    // Cleanup
    await prisma.challenge.delete({ where: { id: data.challenge.id } });
  });

  test('POST /api/workspaces/[slug]/challenges - create challenge with SKU reward', async ({ page }) => {
    const challengeData = {
      title: `SKU Challenge ${Date.now()}`,
      description: 'Test challenge with SKU reward',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      rewardType: 'sku',
      rewardConfig: {
        skuId: 'TEST-SKU-001',
        quantity: 1,
        description: 'Test product reward'
      }
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/challenges`, {
      headers: { 'Content-Type': 'application/json' },
      data: challengeData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.challenge.rewardType).toBe('sku');
    expect(data.challenge.rewardConfig).toBeTruthy();
    expect(data.challenge.rewardConfig.skuId).toBe('TEST-SKU-001');

    // Cleanup
    await prisma.challenge.delete({ where: { id: data.challenge.id } });
  });

  test('POST /api/workspaces/[slug]/challenges - create challenge with monetary reward', async ({ page }) => {
    const challengeData = {
      title: `Monetary Challenge ${Date.now()}`,
      description: 'Test challenge with monetary reward',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      rewardType: 'monetary',
      rewardConfig: {
        amount: 5000, // $50.00
        currency: 'USD',
        description: '$50 cash reward'
      }
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/challenges`, {
      headers: { 'Content-Type': 'application/json' },
      data: challengeData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.challenge.rewardType).toBe('monetary');
    expect(data.challenge.rewardConfig).toBeTruthy();
    expect(data.challenge.rewardConfig.amount).toBe(5000);
    expect(data.challenge.rewardConfig.currency).toBe('USD');

    // Cleanup
    await prisma.challenge.delete({ where: { id: data.challenge.id } });
  });

  test('Activity submission triggers reward - end-to-end flow', async ({ page }) => {
    // 1. Create challenge with reward
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `E2E Reward Test ${Date.now()}`,
        description: 'Test end-to-end reward flow',
        startDate: new Date(Date.now() - 86400000), // Yesterday (active)
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        rewardType: 'points',
        rewardConfig: {
          pointsAmount: 50,
          description: '50 points reward'
        }
      }
    });

    // 2. Create activity template and activity
    const template = await prisma.activityTemplate.create({
      data: {
        id: randomUUID(),
        name: 'Test Activity',
        description: 'Test activity for reward',
        type: 'TEXT_SUBMISSION',
        workspaceId,
        requiresApproval: true
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

    // 3. Enroll participant
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId: challenge.id,
        status: 'ENROLLED'
      }
    });

    // 4. Submit activity
    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId: activity.id,
        userId: participantId,
        enrollmentId: enrollment.id,
        textContent: 'Test submission for reward',
        status: SubmissionStatus.PENDING
      }
    });

    // 5. Admin approves submission (should trigger reward)
    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        pointsAwarded: 50,
        reviewNotes: 'Approved for testing'
      }
    });

    expect(response.status()).toBe(200);

    // 6. Verify RewardIssuance was created
    const rewardIssuance = await prisma.rewardIssuance.findFirst({
      where: {
        userId: participantId,
        challengeId: challenge.id,
        type: 'points'
      }
    });

    expect(rewardIssuance).toBeTruthy();
    expect(rewardIssuance?.amount).toBe(50);
    expect(rewardIssuance?.status).toBe(RewardStatus.PENDING);

    // 7. Verify submission is linked to reward
    const updatedSubmission = await prisma.activitySubmission.findUnique({
      where: { id: submission.id },
      include: { RewardIssuance: true }
    });

    expect(updatedSubmission?.rewardIssued).toBe(true);
    expect(updatedSubmission?.rewardIssuanceId).toBe(rewardIssuance?.id);

    // Cleanup
    await prisma.rewardIssuance.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.activitySubmission.deleteMany({ where: { enrollmentId: enrollment.id } });
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
    await prisma.activity.delete({ where: { id: activity.id } });
    await prisma.activityTemplate.delete({ where: { id: template.id } });
    await prisma.challenge.delete({ where: { id: challenge.id } });
  });

  test('Review approval creates RewardIssuance with correct status', async ({ page }) => {
    // Setup challenge with SKU reward
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `SKU Reward Test ${Date.now()}`,
        description: 'Test SKU reward issuance',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        rewardType: 'sku',
        rewardConfig: {
          skuId: 'TEST-SKU-002',
          quantity: 1
        }
      }
    });

    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    });

    const activity = await prisma.activity.create({
      data: {
        id: randomUUID(),
        templateId: template!.id,
        challengeId: challenge.id,
        pointsValue: 0,
        rewardRules: [{
          type: 'SKU',
          skuId: 'TEST-SKU-002'
        }]
      }
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId: challenge.id,
        status: 'ENROLLED'
      }
    });

    const submission = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId: activity.id,
        userId: participantId,
        enrollmentId: enrollment.id,
        textContent: 'SKU reward test',
        status: SubmissionStatus.PENDING
      }
    });

    // Approve with SKU reward
    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions/${submission.id}/review`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'APPROVED',
        reward: {
          type: 'sku',
          skuId: 'TEST-SKU-002'
        }
      }
    });

    expect(response.status()).toBe(200);

    // Verify reward issuance
    const reward = await prisma.rewardIssuance.findFirst({
      where: {
        userId: participantId,
        challengeId: challenge.id,
        type: 'sku'
      }
    });

    expect(reward).toBeTruthy();
    expect(reward?.skuId).toBe('TEST-SKU-002');
    expect(reward?.status).toBe(RewardStatus.PENDING);

    // Cleanup
    await prisma.rewardIssuance.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.activitySubmission.deleteMany({ where: { enrollmentId: enrollment.id } });
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
    await prisma.activity.delete({ where: { id: activity.id } });
    await prisma.challenge.delete({ where: { id: challenge.id } });
  });

  test('Test reward status transitions (PENDING → ISSUED)', async ({ page }) => {
    // Create a reward issuance
    const reward = await prisma.rewardIssuance.create({
      data: {
        id: randomUUID(),
        userId: participantId,
        workspaceId,
        type: 'points',
        amount: 100,
        status: RewardStatus.PENDING
      }
    });

    expect(reward.status).toBe(RewardStatus.PENDING);
    expect(reward.issuedAt).toBeNull();

    // Update to ISSUED
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

  test('TenantSku mapping verification', async () => {
    // Create a TenantSku mapping
    const tenantSku = await prisma.tenantSku.create({
      data: {
        id: randomUUID(),
        tenantId: 'default',
        skuId: 'TEST-SKU-001',
        label: 'Test Product',
        provider: 'test-provider'
      }
    });

    expect(tenantSku.tenantId).toBe('default');
    expect(tenantSku.skuId).toBe('TEST-SKU-001');
    expect(tenantSku.label).toBe('Test Product');

    // Test unique constraint (tenantId + skuId)
    const duplicateAttempt = prisma.tenantSku.create({
      data: {
        id: randomUUID(),
        tenantId: 'default',
        skuId: 'TEST-SKU-001', // Same skuId for same tenant
        label: 'Different Label',
        provider: 'test-provider'
      }
    });

    await expect(duplicateAttempt).rejects.toThrow();

    // Cleanup
    await prisma.tenantSku.delete({ where: { id: tenantSku.id } });
  });
});
