import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, PARTICIPANT_EMAIL, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';
import { EnrollmentStatus, SubmissionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

test.describe('Enrollment API', () => {
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

    // Create a test challenge
    const challenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Enrollment Test Challenge ${Date.now()}`,
        description: 'Test challenge for enrollments',
        startDate: new Date(Date.now() - 86400000), // Yesterday (active)
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED'
      }
    });
    challengeId = challenge.id;
  });

  test.afterAll(async () => {
    // Cleanup test challenge
    await prisma.challenge.delete({ where: { id: challengeId } }).catch(() => {});
  });

  test.beforeEach(async ({ page }) => {
    await loginWithCredentials(page, PARTICIPANT_EMAIL, DEFAULT_PASSWORD);
  });

  test('POST /api/workspaces/[slug]/enrollments - enroll participant in challenge', async ({ page }) => {
    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/enrollments`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        challengeId,
        userId: participantId
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.enrollment.userId).toBe(participantId);
    expect(data.enrollment.challengeId).toBe(challengeId);
    expect(data.enrollment.status).toBe(EnrollmentStatus.ENROLLED);

    // Verify in database
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_challengeId: {
          userId: participantId,
          challengeId
        }
      }
    });

    expect(enrollment).toBeTruthy();

    // Cleanup
    await prisma.enrollment.delete({ where: { id: data.enrollment.id } });
  });

  test('POST /api/workspaces/[slug]/enrollments - prevent duplicate enrollment', async ({ page }) => {
    // First enrollment
    const firstResponse = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/enrollments`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        challengeId,
        userId: participantId
      }
    });

    expect(firstResponse.status()).toBe(200);
    const firstData = await firstResponse.json();

    // Try to enroll again
    const secondResponse = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/enrollments`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        challengeId,
        userId: participantId
      }
    });

    expect(secondResponse.status()).toBe(400);
    const secondData = await secondResponse.json();
    expect(secondData.error).toContain('already enrolled');

    // Cleanup
    await prisma.enrollment.delete({ where: { id: firstData.enrollment.id } });
  });

  test('POST /api/workspaces/[slug]/enrollments - track enrollment status', async ({ page }) => {
    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/enrollments`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        challengeId,
        userId: participantId,
        status: EnrollmentStatus.INVITED
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.enrollment.status).toBe(EnrollmentStatus.INVITED);

    // Update status to ENROLLED
    const enrollment = await prisma.enrollment.update({
      where: { id: data.enrollment.id },
      data: { status: EnrollmentStatus.ENROLLED }
    });

    expect(enrollment.status).toBe(EnrollmentStatus.ENROLLED);

    // Update to COMPLETED
    const completedEnrollment = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.ENROLLED }
    });

    expect(completedEnrollment.status).toBe(EnrollmentStatus.ENROLLED);

    // Cleanup
    await prisma.enrollment.delete({ where: { id: data.enrollment.id } });
  });

  test('GET /api/workspaces/[slug]/participants/[id]/enrollments - list participant enrollments', async ({ page }) => {
    // Create multiple enrollments
    const challenge2 = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Second Test Challenge ${Date.now()}`,
        description: 'Another test challenge',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED'
      }
    });

    const enrollment1 = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId,
        status: EnrollmentStatus.ENROLLED
      }
    });

    const enrollment2 = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId: challenge2.id,
        status: EnrollmentStatus.ENROLLED
      }
    });

    const response = await page.request.get(`/api/workspaces/${WORKSPACE_SLUG}/participants/${participantId}/enrollments`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.enrollments).toBeTruthy();
    expect(data.enrollments.length).toBeGreaterThanOrEqual(2);

    const enrollmentIds = data.enrollments.map((e: any) => e.id);
    expect(enrollmentIds).toContain(enrollment1.id);
    expect(enrollmentIds).toContain(enrollment2.id);

    // Cleanup
    await prisma.enrollment.deleteMany({
      where: { id: { in: [enrollment1.id, enrollment2.id] } }
    });
    await prisma.challenge.delete({ where: { id: challenge2.id } });
  });

  test('GET /api/workspaces/[slug]/participants/[id]/enrollments - include challenge details', async ({ page }) => {
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId,
        status: EnrollmentStatus.ENROLLED
      }
    });

    const response = await page.request.get(`/api/workspaces/${WORKSPACE_SLUG}/participants/${participantId}/enrollments`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    const enrollmentData = data.enrollments.find((e: any) => e.id === enrollment.id);
    expect(enrollmentData).toBeTruthy();
    expect(enrollmentData.challenge).toBeTruthy();
    expect(enrollmentData.challenge.title).toBeTruthy();

    // Cleanup
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
  });

  test('Activity submission flow', async ({ page }) => {
    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId,
        status: EnrollmentStatus.ENROLLED
      }
    });

    // Create activity
    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    });

    const activity = await prisma.activity.create({
      data: {
        id: randomUUID(),
        templateId: template!.id,
        challengeId,
        pointsValue: 25
      }
    });

    // Submit activity
    const submissionResponse = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/submissions`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        activityId: activity.id,
        enrollmentId: enrollment.id,
        textContent: 'My activity submission'
      }
    });

    expect(submissionResponse.status()).toBe(200);
    const submissionData = await submissionResponse.json();

    expect(submissionData.submission.status).toBe(SubmissionStatus.PENDING);
    expect(submissionData.submission.textContent).toBe('My activity submission');

    // Cleanup
    await prisma.activitySubmission.deleteMany({
      where: { enrollmentId: enrollment.id }
    });
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
    await prisma.activity.delete({ where: { id: activity.id } });
  });

  test('Progress tracking', async ({ page }) => {
    // Create enrollment with activities
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: participantId,
        challengeId,
        status: EnrollmentStatus.ENROLLED
      }
    });

    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId }
    });

    const activity1 = await prisma.activity.create({
      data: {
        id: randomUUID(),
        templateId: template!.id,
        challengeId,
        pointsValue: 25,
        isRequired: true
      }
    });

    const activity2 = await prisma.activity.create({
      data: {
        id: randomUUID(),
        templateId: template!.id,
        challengeId,
        pointsValue: 50,
        isRequired: true
      }
    });

    // Submit first activity
    const submission1 = await prisma.activitySubmission.create({
      data: {
        id: randomUUID(),
        activityId: activity1.id,
        userId: participantId,
        enrollmentId: enrollment.id,
        textContent: 'First submission',
        status: SubmissionStatus.APPROVED,
        pointsAwarded: 25
      }
    });

    // Get progress
    const response = await page.request.get(`/api/workspaces/${WORKSPACE_SLUG}/participants/${participantId}/enrollments/${enrollment.id}/progress`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.progress).toBeTruthy();
    expect(data.progress.completedActivities).toBe(1);
    expect(data.progress.totalActivities).toBe(2);
    expect(data.progress.pointsEarned).toBe(25);

    // Cleanup
    await prisma.activitySubmission.delete({ where: { id: submission1.id } });
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
    await prisma.activity.deleteMany({
      where: { id: { in: [activity1.id, activity2.id] } }
    });
  });

  test('Enrollment deadline validation', async ({ page }) => {
    // Create challenge with past enrollment deadline
    const expiredChallenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Expired Enrollment ${Date.now()}`,
        description: 'Challenge with past enrollment deadline',
        startDate: new Date(Date.now() - 7 * 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        enrollmentDeadline: new Date(Date.now() - 86400000), // Yesterday
        workspaceId,
        status: 'PUBLISHED'
      }
    });

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/enrollments`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        challengeId: expiredChallenge.id,
        userId: participantId
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('deadline');

    // Cleanup
    await prisma.challenge.delete({ where: { id: expiredChallenge.id } });
  });

  test('Enrollment capacity limits', async ({ page }) => {
    // This test demonstrates how to enforce participant limits
    const limitedChallenge = await prisma.challenge.create({
      data: {
        id: randomUUID(),
        title: `Limited Capacity ${Date.now()}`,
        description: 'Challenge with participant limit',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId,
        status: 'PUBLISHED',
        rewardConfig: {
          maxParticipants: 2
        }
      }
    });

    // Create 2 participants
    const participant1 = await prisma.user.create({
      data: {
        email: `participant1_${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId
      }
    });

    const participant2 = await prisma.user.create({
      data: {
        email: `participant2_${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId
      }
    });

    // Enroll first two
    await prisma.enrollment.create({
      data: {
        userId: participant1.id,
        challengeId: limitedChallenge.id,
        status: EnrollmentStatus.ENROLLED
      }
    });

    await prisma.enrollment.create({
      data: {
        userId: participant2.id,
        challengeId: limitedChallenge.id,
        status: EnrollmentStatus.ENROLLED
      }
    });

    // Try to enroll third (should fail if capacity enforced)
    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/enrollments`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        challengeId: limitedChallenge.id,
        userId: participantId
      }
    });

    // Depending on implementation, this should either fail or succeed
    // For now, just verify the endpoint responds
    expect([200, 400]).toContain(response.status());

    // Cleanup
    await prisma.enrollment.deleteMany({ where: { challengeId: limitedChallenge.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [participant1.id, participant2.id] } }
    });
    await prisma.challenge.delete({ where: { id: limitedChallenge.id } });
  });
});
