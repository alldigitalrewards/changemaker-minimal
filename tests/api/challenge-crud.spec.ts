import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';
import { ChallengeStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

test.describe('Challenge CRUD API', () => {
  const WORKSPACE_SLUG = 'alldigitalrewards';
  let workspaceId: string;

  test.beforeAll(async () => {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: WORKSPACE_SLUG }
    });
    workspaceId = workspace!.id;
  });

  test.beforeEach(async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);
  });

  test('POST /api/workspaces/[slug]/challenges - create with all fields', async ({ page }) => {
    const challengeData = {
      title: `Complete Challenge ${Date.now()}`,
      description: 'Full test challenge with all fields',
      startDate: new Date(Date.now() + 7 * 86400000).toISOString(), // Start in 7 days
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      enrollmentDeadline: new Date(Date.now() + 5 * 86400000).toISOString(), // Enroll deadline in 5 days (before start)
      rewardType: 'points',
      rewardConfig: {
        pointsAmount: 200,
        description: '200 points for completion',
        bonusRules: [
          { type: 'EARLY_COMPLETION', bonus: 50 }
        ]
      },
      emailEditAllowed: false
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/challenges`, {
      headers: { 'Content-Type': 'application/json' },
      data: challengeData
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    expect(data.challenge.title).toBe(challengeData.title);
    expect(data.challenge.description).toBe(challengeData.description);
    expect(data.challenge.rewardType).toBe('points');
    expect(data.challenge.rewardConfig.pointsAmount).toBe(200);
    expect(data.challenge.emailEditAllowed).toBe(false);
    expect(data.challenge.workspaceId).toBe(workspaceId);

    // Cleanup
    await prisma.challenge.delete({ where: { id: data.challenge.id } });
  });

  test('POST /api/workspaces/[slug]/challenges - validate required fields', async ({ page }) => {
    const invalidData = {
      // Missing title
      description: 'Missing title field',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString()
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/challenges`, {
      headers: { 'Content-Type': 'application/json' },
      data: invalidData
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  test('POST /api/workspaces/[slug]/challenges - create with activities', async ({ page }) => {
    // First create an activity template
    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    });

    const challengeData = {
      title: `Challenge with Activities ${Date.now()}`,
      description: 'Test challenge with pre-defined activities',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      activities: [
        {
          templateId: template!.id,
          pointsValue: 50,
          maxSubmissions: 1,
          isRequired: true
        },
        {
          templateId: template!.id,
          pointsValue: 25,
          maxSubmissions: 3,
          isRequired: false
        }
      ]
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/challenges`, {
      headers: { 'Content-Type': 'application/json' },
      data: challengeData
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    // Verify activities were created
    const activities = await prisma.activity.findMany({
      where: { challengeId: data.challenge.id }
    });

    expect(activities.length).toBe(2);
    expect(activities.some(a => a.pointsValue === 50 && a.isRequired)).toBe(true);
    expect(activities.some(a => a.pointsValue === 25 && !a.isRequired)).toBe(true);

    // Cleanup
    await prisma.challenge.delete({ where: { id: data.challenge.id } });
  });

  test('PUT /api/workspaces/[slug]/challenges/[id] - update challenge', async ({ page }) => {
    // Create challenge
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Update Test ${Date.now()}`,
        description: 'Original description',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: ChallengeStatus.DRAFT
      }
    });

    // Update it
    const updateData = {
      title: 'Updated Title',
      description: 'Updated description',
      status: 'PUBLISHED'
    };

    const response = await page.request.put(`/api/workspaces/${WORKSPACE_SLUG}/challenges/${challenge.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: updateData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.challenge.title).toBe('Updated Title');
    expect(data.challenge.description).toBe('Updated description');
    expect(data.challenge.status).toBe('PUBLISHED');

    // Cleanup
    await prisma.challenge.delete({ where: { id: challenge.id } });
  });

  test('PUT /api/workspaces/[slug]/challenges/[id] - update activities', async ({ page }) => {
    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    });

    // Create challenge with activity
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Update Activities Test ${Date.now()}`,
        description: 'Test updating activities',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        Activity: {
          create: {
            id: randomUUID(),
            templateId: template!.id,
            pointsValue: 30,
            maxSubmissions: 1
          }
        }
      },
      include: { Activity: true }
    });

    const originalActivityId = challenge.Activity[0].id;

    // Update activity points
    const updateData = {
      activities: [
        {
          id: originalActivityId,
          pointsValue: 50 // Changed from 30
        }
      ]
    };

    const response = await page.request.put(`/api/workspaces/${WORKSPACE_SLUG}/challenges/${challenge.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: updateData
    });

    expect(response.status()).toBe(200);

    // Verify activity was updated
    const updatedActivity = await prisma.activity.findUnique({
      where: { id: originalActivityId }
    });

    expect(updatedActivity?.pointsValue).toBe(50);

    // Cleanup
    await prisma.challenge.delete({ where: { id: challenge.id } });
  });

  test('PUT /api/workspaces/[slug]/challenges/[id] - update reward config', async ({ page }) => {
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Reward Update Test ${Date.now()}`,
        description: 'Test reward config update',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        rewardType: 'points',
        rewardConfig: {
          pointsAmount: 100
        }
      }
    });

    const updateData = {
      rewardType: 'sku',
      rewardConfig: {
        skuId: 'NEW-SKU-001',
        quantity: 1,
        description: 'Updated to SKU reward'
      }
    };

    const response = await page.request.put(`/api/workspaces/${WORKSPACE_SLUG}/challenges/${challenge.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: updateData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.challenge.rewardType).toBe('sku');
    expect(data.challenge.rewardConfig.skuId).toBe('NEW-SKU-001');

    // Cleanup
    await prisma.challenge.delete({ where: { id: challenge.id } });
  });

  test('DELETE /api/workspaces/[slug]/challenges/[id] - delete challenge', async ({ page }) => {
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Delete Test ${Date.now()}`,
        description: 'Will be deleted',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId
      }
    });

    const response = await page.request.delete(`/api/workspaces/${WORKSPACE_SLUG}/challenges/${challenge.id}`);

    expect(response.status()).toBe(200);

    // Verify deletion
    const deletedChallenge = await prisma.challenge.findUnique({
      where: { id: challenge.id }
    });

    expect(deletedChallenge).toBeNull();
  });

  test('DELETE /api/workspaces/[slug]/challenges/[id] - cascade to enrollments', async ({ page }) => {
    // Create challenge with enrollment
    const participant = await prisma.user.findFirst({
      where: { role: 'PARTICIPANT', workspaceId }
    });

    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Cascade Delete Test ${Date.now()}`,
        description: 'Test cascade deletion',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        Enrollment: {
          create: {
            userId: participant!.id,
            status: 'ENROLLED'
          }
        }
      },
      include: { Enrollment: true }
    });

    const enrollmentId = challenge.Enrollment[0].id;

    // Delete challenge
    const response = await page.request.delete(`/api/workspaces/${WORKSPACE_SLUG}/challenges/${challenge.id}`);

    expect(response.status()).toBe(200);

    // Verify enrollment was also deleted (cascade)
    const deletedEnrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId }
    });

    expect(deletedEnrollment).toBeNull();
  });

  test('GET /api/workspaces/[slug]/challenges/[id] - with budget info', async ({ page }) => {
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Budget Test ${Date.now()}`,
        description: 'Test challenge with budget',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        ChallengePointsBudget: {
          create: {
            totalBudget: 10000,
            allocated: 2000,
            workspaceId
          }
        }
      }
    });

    const response = await page.request.get(`/api/workspaces/${WORKSPACE_SLUG}/challenges/${challenge.id}`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.challenge.pointsBudget).toBeTruthy();
    expect(data.challenge.pointsBudget.totalBudget).toBe(10000);
    expect(data.challenge.pointsBudget.remaining).toBe(8000);

    // Cleanup
    await prisma.challenge.delete({ where: { id: challenge.id } });
  });

  test('Challenge validation - end date after start date', async ({ page }) => {
    const invalidData = {
      title: 'Invalid Dates Challenge',
      description: 'End date before start date',
      startDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString() // Before start
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/challenges`, {
      headers: { 'Content-Type': 'application/json' },
      data: invalidData
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('end date');
  });

  test('Challenge workspace isolation', async ({ page }) => {
    // Create challenge in workspace
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Isolation Test ${Date.now()}`,
        description: 'Test workspace isolation',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId
      }
    });

    // Try to access from different workspace slug (should fail or not find)
    const response = await page.request.get(`/api/workspaces/wrong-workspace/challenges/${challenge.id}`);

    expect([404, 403]).toContain(response.status());

    // Cleanup
    await prisma.challenge.delete({ where: { id: challenge.id } });
  });
});
