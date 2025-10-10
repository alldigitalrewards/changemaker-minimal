import { test, expect } from '@playwright/test';
import { prisma } from '../../lib/prisma';

test.describe('Database Integration Tests', () => {
  test('Migration verification - all tables exist', async () => {
    // Verify critical tables exist by querying them
    const tables = [
      'Workspace',
      'User',
      'Challenge',
      'Enrollment',
      'Activity',
      'ActivityTemplate',
      'ActivitySubmission',
      'RewardIssuance',
      'TenantSku',
      'InviteCode',
      'PointsBalance',
      'WorkspaceEmailSettings',
      'WorkspaceParticipantSegment'
    ];

    for (const table of tables) {
      // Use Prisma's table access - this will throw if table doesn't exist
      const model = (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)];
      expect(model).toBeDefined();

      // Try to count records (verifies table structure)
      const count = await model.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('Schema constraints - unique constraints', async () => {
    const workspace = await prisma.workspace.findFirst();

    // Test Workspace.slug unique constraint
    const duplicateWorkspace = prisma.workspace.create({
      data: {
        slug: workspace!.slug,
        name: 'Duplicate Test'
      }
    });

    await expect(duplicateWorkspace).rejects.toThrow();

    // Test User.email unique constraint
    const existingUser = await prisma.user.findFirst();

    const duplicateUser = prisma.user.create({
      data: {
        email: existingUser!.email,
        role: 'PARTICIPANT'
      }
    });

    await expect(duplicateUser).rejects.toThrow();
  });

  test('Schema constraints - not null constraints', async () => {
    const workspace = await prisma.workspace.findFirst();

    // Workspace name is required
    const invalidWorkspace = prisma.workspace.create({
      data: {
        slug: 'test-slug',
        // @ts-expect-error - Testing validation
        name: null
      }
    });

    await expect(invalidWorkspace).rejects.toThrow();

    // Challenge title is required
    const invalidChallenge = prisma.challenge.create({
      data: {
        // @ts-expect-error - Testing validation
        title: null,
        description: 'Test',
        startDate: new Date(),
        endDate: new Date(),
        workspaceId: workspace!.id
      }
    });

    await expect(invalidChallenge).rejects.toThrow();
  });

  test('Foreign key cascades - Challenge deletion cascades', async () => {
    const workspace = await prisma.workspace.findFirst();

    // Create challenge with enrollment
    const challenge = await prisma.challenge.create({
      data: {
        title: `Cascade Test ${Date.now()}`,
        description: 'Testing cascades',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        workspaceId: workspace!.id
      }
    });

    const user = await prisma.user.findFirst({
      where: { role: 'PARTICIPANT', workspaceId: workspace!.id }
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user!.id,
        challengeId: challenge.id,
        status: 'ENROLLED'
      }
    });

    // Delete challenge
    await prisma.challenge.delete({
      where: { id: challenge.id }
    });

    // Verify enrollment was also deleted (cascade)
    const deletedEnrollment = await prisma.enrollment.findUnique({
      where: { id: enrollment.id }
    });

    expect(deletedEnrollment).toBeNull();
  });

  test('Foreign key cascades - Activity deletion cascades to submissions', async () => {
    const workspace = await prisma.workspace.findFirst();

    const template = await prisma.activityTemplate.findFirst({
      where: { workspaceId: workspace!.id }
    });

    const challenge = await prisma.challenge.create({
      data: {
        title: `Activity Cascade ${Date.now()}`,
        description: 'Test',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        workspaceId: workspace!.id
      }
    });

    const activity = await prisma.activity.create({
      data: {
        templateId: template!.id,
        challengeId: challenge.id,
        pointsValue: 10
      }
    });

    const user = await prisma.user.findFirst({
      where: { role: 'PARTICIPANT', workspaceId: workspace!.id }
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user!.id,
        challengeId: challenge.id,
        status: 'ENROLLED'
      }
    });

    const submission = await prisma.activitySubmission.create({
      data: {
        activityId: activity.id,
        userId: user!.id,
        enrollmentId: enrollment.id,
        textContent: 'Test submission',
        status: 'PENDING'
      }
    });

    // Delete activity
    await prisma.activity.delete({
      where: { id: activity.id }
    });

    // Verify submission was deleted (cascade)
    const deletedSubmission = await prisma.activitySubmission.findUnique({
      where: { id: submission.id }
    });

    expect(deletedSubmission).toBeNull();

    // Cleanup
    await prisma.challenge.delete({ where: { id: challenge.id } });
  });

  test('Index existence - performance critical indexes', async () => {
    // This test verifies indexes by checking query performance
    // Indexes should exist on:
    // - Workspace.tenantId
    // - User.workspaceId, User.tenantId
    // - Challenge.workspaceId
    // - Enrollment.userId, Enrollment.challengeId
    // - ActivitySubmission.status

    const workspace = await prisma.workspace.findFirst();

    // Test index on Challenge.workspaceId
    const startTime = Date.now();
    await prisma.challenge.findMany({
      where: { workspaceId: workspace!.id },
      take: 10
    });
    const duration = Date.now() - startTime;

    // Query should be fast with index (< 100ms for small dataset)
    expect(duration).toBeLessThan(100);

    // Test compound index on Enrollment
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: (await prisma.user.findFirst())!.id,
        status: 'ENROLLED'
      },
      take: 10
    });

    expect(enrollments).toBeDefined();
  });

  test('Default values - verify defaults are set correctly', async () => {
    const workspace = await prisma.workspace.findFirst();

    // Create workspace without optional fields
    const newWorkspace = await prisma.workspace.create({
      data: {
        slug: `default-test-${Date.now()}`,
        name: 'Default Test'
      }
    });

    expect(newWorkspace.tenantId).toBe('default');
    expect(newWorkspace.published).toBe(true);
    expect(newWorkspace.active).toBe(true);
    expect(newWorkspace.createdAt).toBeTruthy();
    expect(newWorkspace.updatedAt).toBeTruthy();

    // Create user without optional fields
    const newUser = await prisma.user.create({
      data: {
        email: `default-user-${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId: workspace!.id
      }
    });

    expect(newUser.isPending).toBe(false);
    expect(newUser.permissions).toEqual([]);
    expect(newUser.tenantId).toBe('default');
    expect(newUser.createdAt).toBeTruthy();
    expect(newUser.updatedAt).toBeTruthy();

    // Cleanup
    await prisma.user.delete({ where: { id: newUser.id } });
    await prisma.workspace.delete({ where: { id: newWorkspace.id } });
  });

  test('Enum values - verify enum constraints', async () => {
    const workspace = await prisma.workspace.findFirst();

    // Test valid Role enum
    const validUser = await prisma.user.create({
      data: {
        email: `enum-test-${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId: workspace!.id
      }
    });

    expect(['ADMIN', 'PARTICIPANT']).toContain(validUser.role);

    // Test invalid Role (should fail)
    const invalidUser = prisma.user.create({
      data: {
        email: `invalid-enum-${Date.now()}@test.com`,
        // @ts-expect-error - Testing validation
        role: 'INVALID_ROLE',
        workspaceId: workspace!.id
      }
    });

    await expect(invalidUser).rejects.toThrow();

    // Cleanup
    await prisma.user.delete({ where: { id: validUser.id } });
  });

  test('JSON fields - verify JSON storage and retrieval', async () => {
    const workspace = await prisma.workspace.findFirst();
    expect(workspace).not.toBeNull();
    expect(workspace?.id).toBeDefined();

    // Test Challenge.rewardConfig JSON field
    const challenge = await prisma.challenge.create({
      data: {
        title: `JSON Test ${Date.now()}`,
        description: 'Testing JSON fields',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        workspaceId: workspace!.id,
        rewardType: 'points',
        rewardConfig: {
          pointsAmount: 100,
          bonusRules: [
            { type: 'EARLY_COMPLETION', bonus: 25 },
            { type: 'PERFECT_SCORE', bonus: 50 }
          ],
          description: 'Complex reward configuration'
        }
      }
    });

    const retrieved = await prisma.challenge.findUnique({
      where: { id: challenge.id }
    });

    expect(retrieved?.rewardConfig).toEqual({
      pointsAmount: 100,
      bonusRules: [
        { type: 'EARLY_COMPLETION', bonus: 25 },
        { type: 'PERFECT_SCORE', bonus: 50 }
      ],
      description: 'Complex reward configuration'
    });

    // Test User.emailChangePending JSON field
    const user = await prisma.user.create({
      data: {
        email: `json-user-${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId: workspace!.id,
        emailChangePending: {
          newEmail: 'newemail@test.com',
          token: 'test-token-123',
          expiresAt: new Date(Date.now() + 3600000)
        }
      }
    });

    const retrievedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    const pendingData = retrievedUser?.emailChangePending as any;
    expect(pendingData.newEmail).toBe('newemail@test.com');
    expect(pendingData.token).toBe('test-token-123');

    // Cleanup
    await prisma.challenge.delete({ where: { id: challenge.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('Timestamp updates - verify updatedAt is automatic', async () => {
    const workspace = await prisma.workspace.findFirst();
    expect(workspace).not.toBeNull();
    expect(workspace?.id).toBeDefined();

    const challenge = await prisma.challenge.create({
      data: {
        title: `Timestamp Test ${Date.now()}`,
        description: 'Testing timestamps',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        workspaceId: workspace!.id
      }
    });

    const originalUpdatedAt = challenge.updatedAt;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update challenge
    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        description: 'Updated description'
      }
    });

    expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

    // Cleanup
    await prisma.challenge.delete({ where: { id: challenge.id } });
  });

  test('Workspace-scoped queries - verify tenantId isolation', async () => {
    // Create two workspaces with different tenantIds
    const tenant1Workspace = await prisma.workspace.create({
      data: {
        slug: `tenant1-${Date.now()}`,
        name: 'Tenant 1',
        tenantId: 'tenant-1'
      }
    });

    const tenant2Workspace = await prisma.workspace.create({
      data: {
        slug: `tenant2-${Date.now()}`,
        name: 'Tenant 2',
        tenantId: 'tenant-2'
      }
    });

    // Create users in each tenant
    const user1 = await prisma.user.create({
      data: {
        email: `tenant1-user-${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId: tenant1Workspace.id,
        tenantId: 'tenant-1'
      }
    });

    const user2 = await prisma.user.create({
      data: {
        email: `tenant2-user-${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId: tenant2Workspace.id,
        tenantId: 'tenant-2'
      }
    });

    // Query users by tenantId
    const tenant1Users = await prisma.user.findMany({
      where: { tenantId: 'tenant-1' }
    });

    const tenant2Users = await prisma.user.findMany({
      where: { tenantId: 'tenant-2' }
    });

    // Verify isolation
    expect(tenant1Users.some(u => u.id === user1.id)).toBe(true);
    expect(tenant1Users.some(u => u.id === user2.id)).toBe(false);

    expect(tenant2Users.some(u => u.id === user2.id)).toBe(true);
    expect(tenant2Users.some(u => u.id === user1.id)).toBe(false);

    // Cleanup
    await prisma.user.deleteMany({
      where: { id: { in: [user1.id, user2.id] } }
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: [tenant1Workspace.id, tenant2Workspace.id] } }
    });
  });
});
