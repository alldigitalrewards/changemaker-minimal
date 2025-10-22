import { test, expect } from '@playwright/test';

/**
 * Authorization Middleware Tests (Task 6)
 * 
 * Tests for lib/auth/api-auth.ts middleware functions:
 * - requireAuth()
 * - requireWorkspaceAccess()
 * - requireWorkspaceAdmin()
 * - requireManagerOrAdmin() [NEW]
 */

test.describe('Authorization Middleware', () => {
  test('requireManagerOrAdmin helper function exists', async () => {
    const { requireManagerOrAdmin } = await import('../../lib/auth/api-auth');
    expect(requireManagerOrAdmin).toBeDefined();
    expect(typeof requireManagerOrAdmin).toBe('function');
  });

  test('requireWorkspaceAdmin helper function exists', async () => {
    const { requireWorkspaceAdmin } = await import('../../lib/auth/api-auth');
    expect(requireWorkspaceAdmin).toBeDefined();
    expect(typeof requireWorkspaceAdmin).toBe('function');
  });

  test('requireWorkspaceAccess helper function exists', async () => {
    const { requireWorkspaceAccess } = await import('../../lib/auth/api-auth');
    expect(requireWorkspaceAccess).toBeDefined();
    expect(typeof requireWorkspaceAccess).toBe('function');
  });

  test('requireAuth helper function exists', async () => {
    const { requireAuth } = await import('../../lib/auth/api-auth');
    expect(requireAuth).toBeDefined();
    expect(typeof requireAuth).toBe('function');
  });

  test('all middleware functions are exported', async () => {
    const authModule = await import('../../lib/auth/api-auth');
    expect(authModule.requireAuth).toBeDefined();
    expect(authModule.requireWorkspaceAccess).toBeDefined();
    expect(authModule.requireWorkspaceAdmin).toBeDefined();
    expect(authModule.requireManagerOrAdmin).toBeDefined();
    expect(authModule.withErrorHandling).toBeDefined();
  });
});
