import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';

test.describe('Participants API', () => {
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

  test('POST /api/workspaces/[slug]/participants - create participant', async ({ page }) => {
    const participantData = {
      email: `newparticipant_${Date.now()}@test.com`,
      role: 'PARTICIPANT'
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/participants`, {
      headers: { 'Content-Type': 'application/json' },
      data: participantData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.participant.email).toBe(participantData.email);
    expect(data.participant.role).toBe('PARTICIPANT');
    expect(data.participant.workspaceId).toBe(workspaceId);

    // Cleanup
    await prisma.user.delete({ where: { id: data.participant.id } });
  });

  test('GET /api/workspaces/[slug]/participants/[id] - get participant details', async ({ page }) => {
    const participant = await prisma.user.create({
      data: {
        email: `testuser_${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId
      }
    });

    const response = await page.request.get(`/api/workspaces/${WORKSPACE_SLUG}/participants/${participant.id}`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.participant.id).toBe(participant.id);
    expect(data.participant.email).toBe(participant.email);

    // Cleanup
    await prisma.user.delete({ where: { id: participant.id } });
  });

  test('POST /api/workspaces/[slug]/participants/bulk - bulk create participants', async ({ page }) => {
    const bulkData = {
      participants: [
        { email: `bulk1_${Date.now()}@test.com`, role: 'PARTICIPANT' },
        { email: `bulk2_${Date.now()}@test.com`, role: 'PARTICIPANT' },
        { email: `bulk3_${Date.now()}@test.com`, role: 'PARTICIPANT' }
      ]
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/participants/bulk`, {
      headers: { 'Content-Type': 'application/json' },
      data: bulkData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.created).toBe(3);
    expect(data.participants.length).toBe(3);

    // Verify all were created
    for (const p of data.participants) {
      const user = await prisma.user.findUnique({ where: { id: p.id } });
      expect(user).toBeTruthy();
    }

    // Cleanup
    await prisma.user.deleteMany({
      where: {
        id: { in: data.participants.map((p: any) => p.id) }
      }
    });
  });

  test('POST /api/workspaces/[slug]/participants/bulk - handle duplicates', async ({ page }) => {
    const existingEmail = `existing_${Date.now()}@test.com`;

    // Create one participant first
    await prisma.user.create({
      data: {
        email: existingEmail,
        role: 'PARTICIPANT',
        workspaceId
      }
    });

    const bulkData = {
      participants: [
        { email: existingEmail, role: 'PARTICIPANT' }, // Duplicate
        { email: `new_${Date.now()}@test.com`, role: 'PARTICIPANT' }
      ]
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/participants/bulk`, {
      headers: { 'Content-Type': 'application/json' },
      data: bulkData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.created).toBe(1); // Only one new
    expect(data.skipped).toBe(1); // One duplicate skipped
    expect(data.errors).toBeTruthy();
    expect(data.errors.length).toBe(1);

    // Cleanup
    await prisma.user.deleteMany({
      where: {
        email: { in: [existingEmail, bulkData.participants[1].email] }
      }
    });
  });

  test('GET /api/workspaces/[slug]/participants/export - export participants', async ({ page }) => {
    const response = await page.request.get(`/api/workspaces/${WORKSPACE_SLUG}/participants/export`);

    expect(response.status()).toBe(200);

    // Should return CSV format
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('csv');

    const csv = await response.text();
    expect(csv).toContain('email');
    expect(csv).toContain('role');
  });

  test('GET /api/workspaces/[slug]/participants/export - with filters', async ({ page }) => {
    const response = await page.request.get(
      `/api/workspaces/${WORKSPACE_SLUG}/participants/export?role=PARTICIPANT&createdAfter=2024-01-01`
    );

    expect(response.status()).toBe(200);
    const csv = await response.text();
    expect(csv).toBeTruthy();
  });

  test('POST /api/workspaces/[slug]/participants/segments - create segment', async ({ page }) => {
    const segmentData = {
      name: `Test Segment ${Date.now()}`,
      description: 'Test participant segment',
      filters: {
        role: 'PARTICIPANT',
        createdAfter: '2024-01-01'
      }
    };

    const response = await page.request.post(`/api/workspaces/${WORKSPACE_SLUG}/participants/segments`, {
      headers: { 'Content-Type': 'application/json' },
      data: segmentData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.segment.name).toBe(segmentData.name);
    expect(data.segment.filters).toEqual(segmentData.filters);

    // Cleanup
    await prisma.workspaceParticipantSegment.delete({ where: { id: data.segment.id } });
  });

  test('GET /api/workspaces/[slug]/participants/segments - list segments', async ({ page }) => {
    // Create test segments
    const segment1 = await prisma.workspaceParticipantSegment.create({
      data: {
        name: `Segment 1 ${Date.now()}`,
        description: 'First test segment',
        workspaceId,
        filters: { role: 'PARTICIPANT' },
        createdById: (await prisma.user.findFirst({ where: { role: 'ADMIN', workspaceId } }))!.id
      }
    });

    const segment2 = await prisma.workspaceParticipantSegment.create({
      data: {
        name: `Segment 2 ${Date.now()}`,
        description: 'Second test segment',
        workspaceId,
        filters: { status: 'active' },
        createdById: (await prisma.user.findFirst({ where: { role: 'ADMIN', workspaceId } }))!.id
      }
    });

    const response = await page.request.get(`/api/workspaces/${WORKSPACE_SLUG}/participants/segments`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.segments).toBeTruthy();
    expect(data.segments.length).toBeGreaterThanOrEqual(2);

    const segmentIds = data.segments.map((s: any) => s.id);
    expect(segmentIds).toContain(segment1.id);
    expect(segmentIds).toContain(segment2.id);

    // Cleanup
    await prisma.workspaceParticipantSegment.deleteMany({
      where: { id: { in: [segment1.id, segment2.id] } }
    });
  });

  test('GET /api/workspaces/[slug]/participants/segments/[id] - get segment with participants', async ({ page }) => {
    // Create participants and segment
    const participant1 = await prisma.user.create({
      data: {
        email: `seg_participant1_${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId
      }
    });

    const segment = await prisma.workspaceParticipantSegment.create({
      data: {
        name: `Active Segment ${Date.now()}`,
        description: 'Segment with participants',
        workspaceId,
        filters: { role: 'PARTICIPANT' },
        createdById: (await prisma.user.findFirst({ where: { role: 'ADMIN', workspaceId } }))!.id
      }
    });

    const response = await page.request.get(`/api/workspaces/${WORKSPACE_SLUG}/participants/segments/${segment.id}`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.segment.id).toBe(segment.id);
    expect(data.segment.name).toBe(segment.name);
    expect(data.participants).toBeTruthy();

    // Cleanup
    await prisma.user.delete({ where: { id: participant1.id } });
    await prisma.workspaceParticipantSegment.delete({ where: { id: segment.id } });
  });

  test('PUT /api/workspaces/[slug]/participants/segments/[id] - update segment', async ({ page }) => {
    const segment = await prisma.workspaceParticipantSegment.create({
      data: {
        name: `Update Test ${Date.now()}`,
        description: 'Original description',
        workspaceId,
        filters: { role: 'PARTICIPANT' },
        createdById: (await prisma.user.findFirst({ where: { role: 'ADMIN', workspaceId } }))!.id
      }
    });

    const updateData = {
      name: 'Updated Segment Name',
      description: 'Updated description',
      filters: { role: 'PARTICIPANT', status: 'active' }
    };

    const response = await page.request.put(`/api/workspaces/${WORKSPACE_SLUG}/participants/segments/${segment.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: updateData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.segment.name).toBe(updateData.name);
    expect(data.segment.description).toBe(updateData.description);

    // Cleanup
    await prisma.workspaceParticipantSegment.delete({ where: { id: segment.id } });
  });

  test('DELETE /api/workspaces/[slug]/participants/segments/[id] - delete segment', async ({ page }) => {
    const segment = await prisma.workspaceParticipantSegment.create({
      data: {
        name: `Delete Test ${Date.now()}`,
        description: 'Will be deleted',
        workspaceId,
        filters: { role: 'PARTICIPANT' },
        createdById: (await prisma.user.findFirst({ where: { role: 'ADMIN', workspaceId } }))!.id
      }
    });

    const response = await page.request.delete(`/api/workspaces/${WORKSPACE_SLUG}/participants/segments/${segment.id}`);

    expect(response.status()).toBe(200);

    // Verify deletion
    const deletedSegment = await prisma.workspaceParticipantSegment.findUnique({
      where: { id: segment.id }
    });

    expect(deletedSegment).toBeNull();
  });

  test('Participant workspace isolation', async ({ page }) => {
    const participant = await prisma.user.create({
      data: {
        email: `isolation_test_${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId
      }
    });

    // Try to access from wrong workspace
    const response = await page.request.get(`/api/workspaces/wrong-workspace/participants/${participant.id}`);

    expect([403, 404]).toContain(response.status());

    // Cleanup
    await prisma.user.delete({ where: { id: participant.id } });
  });

  test('Participant with enrollments - full details', async ({ page }) => {
    const participant = await prisma.user.create({
      data: {
        email: `detailed_test_${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId
      }
    });

    // Create challenge and enrollment
    const challenge = await prisma.challenge.create({
      data: {
        title: `Detail Test ${Date.now()}`,
        description: 'Test challenge',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        workspaceId
      }
    });

    await prisma.enrollment.create({
      data: {
        userId: participant.id,
        challengeId: challenge.id,
        status: 'ENROLLED'
      }
    });

    const response = await page.request.get(`/api/workspaces/${WORKSPACE_SLUG}/participants/${participant.id}?include=enrollments`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.participant.enrollments).toBeTruthy();
    expect(data.participant.enrollments.length).toBe(1);

    // Cleanup
    await prisma.enrollment.deleteMany({ where: { userId: participant.id } });
    await prisma.challenge.delete({ where: { id: challenge.id } });
    await prisma.user.delete({ where: { id: participant.id } });
  });
});
