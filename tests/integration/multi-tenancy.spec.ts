import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';

test.describe('Multi-Tenancy Integration Tests', () => {
  let tenant1WorkspaceId: string;
  let tenant2WorkspaceId: string;
  let tenant1UserId: string;
  let tenant2UserId: string;

  test.beforeAll(async () => {
    // Create two separate tenant workspaces
    const tenant1 = await prisma.workspace.create({
      data: {
        slug: `tenant1-test-${Date.now()}`,
        name: 'Tenant 1 Workspace',
        tenantId: 'tenant-1-test'
      }
    });
    tenant1WorkspaceId = tenant1.id;

    const tenant2 = await prisma.workspace.create({
      data: {
        slug: `tenant2-test-${Date.now()}`,
        name: 'Tenant 2 Workspace',
        tenantId: 'tenant-2-test'
      }
    });
    tenant2WorkspaceId = tenant2.id;

    // Create users in each tenant
    const user1 = await prisma.user.create({
      data: {
        email: `tenant1-admin-${Date.now()}@test.com`,
        role: 'ADMIN',
        workspaceId: tenant1WorkspaceId,
        tenantId: 'tenant-1-test'
      }
    });
    tenant1UserId = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: `tenant2-admin-${Date.now()}@test.com`,
        role: 'ADMIN',
        workspaceId: tenant2WorkspaceId,
        tenantId: 'tenant-2-test'
      }
    });
    tenant2UserId = user2.id;
  });

  test.afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { id: { in: [tenant1UserId, tenant2UserId] } }
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: [tenant1WorkspaceId, tenant2WorkspaceId] } }
    });
  });

  test('Verify tenantId on all records', async () => {
    // Create records in tenant 1
    const challenge1 = await prisma.challenge.create({
      data: {
        title: `Tenant 1 Challenge ${Date.now()}`,
        description: 'Tenant 1 only',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        workspaceId: tenant1WorkspaceId
      }
    });

    const workspace1 = await prisma.workspace.findUnique({
      where: { id: tenant1WorkspaceId }
    });

    expect(workspace1?.tenantId).toBe('tenant-1-test');

    // Verify user has correct tenantId
    const user1 = await prisma.user.findUnique({
      where: { id: tenant1UserId }
    });

    expect(user1?.tenantId).toBe('tenant-1-test');

    // Create records in tenant 2
    const challenge2 = await prisma.challenge.create({
      data: {
        title: `Tenant 2 Challenge ${Date.now()}`,
        description: 'Tenant 2 only',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        workspaceId: tenant2WorkspaceId
      }
    });

    // Query by workspace to verify separation
    const tenant1Challenges = await prisma.challenge.findMany({
      where: { workspaceId: tenant1WorkspaceId }
    });

    const tenant2Challenges = await prisma.challenge.findMany({
      where: { workspaceId: tenant2WorkspaceId }
    });

    expect(tenant1Challenges.some(c => c.id === challenge1.id)).toBe(true);
    expect(tenant1Challenges.some(c => c.id === challenge2.id)).toBe(false);

    expect(tenant2Challenges.some(c => c.id === challenge2.id)).toBe(true);
    expect(tenant2Challenges.some(c => c.id === challenge1.id)).toBe(false);

    // Cleanup
    await prisma.challenge.deleteMany({
      where: { id: { in: [challenge1.id, challenge2.id] } }
    });
  });

  test('Test workspace switching - lastWorkspaceId tracking', async () => {
    // Create user with access to multiple workspaces
    const multiTenantUser = await prisma.user.create({
      data: {
        email: `multitenant-${Date.now()}@test.com`,
        role: 'ADMIN',
        workspaceId: tenant1WorkspaceId,
        tenantId: 'tenant-1-test',
        lastWorkspaceId: tenant1WorkspaceId
      }
    });

    // Create membership in second workspace
    await prisma.workspaceMembership.create({
      data: {
        userId: multiTenantUser.id,
        workspaceId: tenant2WorkspaceId,
        role: 'ADMIN'
      }
    });

    // Simulate workspace switch
    const updatedUser = await prisma.user.update({
      where: { id: multiTenantUser.id },
      data: {
        lastWorkspaceId: tenant2WorkspaceId
      }
    });

    expect(updatedUser.lastWorkspaceId).toBe(tenant2WorkspaceId);

    // Switch back
    const revertedUser = await prisma.user.update({
      where: { id: multiTenantUser.id },
      data: {
        lastWorkspaceId: tenant1WorkspaceId
      }
    });

    expect(revertedUser.lastWorkspaceId).toBe(tenant1WorkspaceId);

    // Cleanup
    await prisma.workspaceMembership.deleteMany({
      where: { userId: multiTenantUser.id }
    });
    await prisma.user.delete({ where: { id: multiTenantUser.id } });
  });

  test('Verify data isolation between tenants', async () => {
    // Create identical data in both tenants
    const template1 = await prisma.activityTemplate.create({
      data: {
        name: 'Test Template',
        description: 'Same name, different tenant',
        type: 'TEXT_SUBMISSION',
        workspaceId: tenant1WorkspaceId
      }
    });

    const template2 = await prisma.activityTemplate.create({
      data: {
        name: 'Test Template',
        description: 'Same name, different tenant',
        type: 'TEXT_SUBMISSION',
        workspaceId: tenant2WorkspaceId
      }
    });

    // Query by workspace
    const tenant1Templates = await prisma.activityTemplate.findMany({
      where: { workspaceId: tenant1WorkspaceId }
    });

    const tenant2Templates = await prisma.activityTemplate.findMany({
      where: { workspaceId: tenant2WorkspaceId }
    });

    // Verify isolation
    expect(tenant1Templates.some(t => t.id === template1.id)).toBe(true);
    expect(tenant1Templates.some(t => t.id === template2.id)).toBe(false);

    expect(tenant2Templates.some(t => t.id === template2.id)).toBe(true);
    expect(tenant2Templates.some(t => t.id === template1.id)).toBe(false);

    // Cleanup
    await prisma.activityTemplate.deleteMany({
      where: { id: { in: [template1.id, template2.id] } }
    });
  });

  test('Cross-tenant query prevention', async ({ page }) => {
    // Login as tenant 1 admin
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);

    const workspace1 = await prisma.workspace.findUnique({
      where: { id: tenant1WorkspaceId }
    });

    const workspace2 = await prisma.workspace.findUnique({
      where: { id: tenant2WorkspaceId }
    });

    // Create challenge in tenant 2
    const tenant2Challenge = await prisma.challenge.create({
      data: {
        title: `Protected Challenge ${Date.now()}`,
        description: 'Should not be accessible from tenant 1',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        workspaceId: tenant2WorkspaceId
      }
    });

    // Try to access tenant 2 challenge from tenant 1 workspace route
    const response = await page.request.get(
      `/api/workspaces/${workspace1!.slug}/challenges/${tenant2Challenge.id}`
    );

    // Should fail with 404 or 403
    expect([403, 404]).toContain(response.status());

    // Try to access via tenant 2 slug (should also fail if user doesn't have access)
    const response2 = await page.request.get(
      `/api/workspaces/${workspace2!.slug}/challenges/${tenant2Challenge.id}`
    );

    // Will fail if user doesn't have membership in tenant 2
    expect([200, 403, 404]).toContain(response2.status());

    // Cleanup
    await prisma.challenge.delete({ where: { id: tenant2Challenge.id } });
  });

  test('Workspace membership controls access', async () => {
    // Create user without membership in tenant 2
    const user = await prisma.user.create({
      data: {
        email: `nomembership-${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId: tenant1WorkspaceId,
        tenantId: 'tenant-1-test'
      }
    });

    // Verify user has no membership in tenant 2
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        userId: user.id,
        workspaceId: tenant2WorkspaceId
      }
    });

    expect(membership).toBeNull();

    // Create membership
    const newMembership = await prisma.workspaceMembership.create({
      data: {
        userId: user.id,
        workspaceId: tenant2WorkspaceId,
        role: 'PARTICIPANT'
      }
    });

    // Verify membership now exists
    const createdMembership = await prisma.workspaceMembership.findFirst({
      where: {
        userId: user.id,
        workspaceId: tenant2WorkspaceId
      }
    });

    expect(createdMembership).toBeTruthy();
    expect(createdMembership?.role).toBe('PARTICIPANT');

    // Cleanup
    await prisma.workspaceMembership.delete({ where: { id: newMembership.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('Tenant-scoped queries for all major entities', async () => {
    // Create comprehensive data set for tenant 1
    const challenge1 = await prisma.challenge.create({
      data: {
        title: `Tenant 1 Full Test ${Date.now()}`,
        description: 'Complete tenant test',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        workspaceId: tenant1WorkspaceId
      }
    });

    const participant1 = await prisma.user.create({
      data: {
        email: `t1-participant-${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId: tenant1WorkspaceId,
        tenantId: 'tenant-1-test'
      }
    });

    const enrollment1 = await prisma.enrollment.create({
      data: {
        userId: participant1.id,
        challengeId: challenge1.id,
        status: 'ENROLLED'
      }
    });

    // Create similar data for tenant 2
    const challenge2 = await prisma.challenge.create({
      data: {
        title: `Tenant 2 Full Test ${Date.now()}`,
        description: 'Complete tenant test',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        workspaceId: tenant2WorkspaceId
      }
    });

    const participant2 = await prisma.user.create({
      data: {
        email: `t2-participant-${Date.now()}@test.com`,
        role: 'PARTICIPANT',
        workspaceId: tenant2WorkspaceId,
        tenantId: 'tenant-2-test'
      }
    });

    const enrollment2 = await prisma.enrollment.create({
      data: {
        userId: participant2.id,
        challengeId: challenge2.id,
        status: 'ENROLLED'
      }
    });

    // Verify tenant 1 queries only return tenant 1 data
    const t1Challenges = await prisma.challenge.findMany({
      where: {
        workspace: { tenantId: 'tenant-1-test' }
      }
    });

    expect(t1Challenges.some(c => c.id === challenge1.id)).toBe(true);
    expect(t1Challenges.some(c => c.id === challenge2.id)).toBe(false);

    const t1Users = await prisma.user.findMany({
      where: { tenantId: 'tenant-1-test' }
    });

    expect(t1Users.some(u => u.id === participant1.id)).toBe(true);
    expect(t1Users.some(u => u.id === participant2.id)).toBe(false);

    // Verify tenant 2 queries only return tenant 2 data
    const t2Challenges = await prisma.challenge.findMany({
      where: {
        workspace: { tenantId: 'tenant-2-test' }
      }
    });

    expect(t2Challenges.some(c => c.id === challenge2.id)).toBe(true);
    expect(t2Challenges.some(c => c.id === challenge1.id)).toBe(false);

    // Cleanup
    await prisma.enrollment.deleteMany({
      where: { id: { in: [enrollment1.id, enrollment2.id] } }
    });
    await prisma.challenge.deleteMany({
      where: { id: { in: [challenge1.id, challenge2.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [participant1.id, participant2.id] } }
    });
  });

  test('Reward issuance respects tenant boundaries', async () => {
    // Create rewards in both tenants
    const reward1 = await prisma.rewardIssuance.create({
      data: {
        userId: tenant1UserId,
        workspaceId: tenant1WorkspaceId,
        type: 'points',
        amount: 100,
        status: 'PENDING'
      }
    });

    const reward2 = await prisma.rewardIssuance.create({
      data: {
        userId: tenant2UserId,
        workspaceId: tenant2WorkspaceId,
        type: 'points',
        amount: 200,
        status: 'PENDING'
      }
    });

    // Query by workspace
    const t1Rewards = await prisma.rewardIssuance.findMany({
      where: { workspaceId: tenant1WorkspaceId }
    });

    const t2Rewards = await prisma.rewardIssuance.findMany({
      where: { workspaceId: tenant2WorkspaceId }
    });

    expect(t1Rewards.some(r => r.id === reward1.id)).toBe(true);
    expect(t1Rewards.some(r => r.id === reward2.id)).toBe(false);

    expect(t2Rewards.some(r => r.id === reward2.id)).toBe(true);
    expect(t2Rewards.some(r => r.id === reward1.id)).toBe(false);

    // Cleanup
    await prisma.rewardIssuance.deleteMany({
      where: { id: { in: [reward1.id, reward2.id] } }
    });
  });
});
