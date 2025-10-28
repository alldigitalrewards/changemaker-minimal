/**
 * Test fixture creation to debug RLS test setup issues
 */

import { test, expect } from '@playwright/test';
import { createServiceRoleClient } from '../utils/supabase-auth-test';
import { TEST_WORKSPACES, createTestWorkspaces, cleanupTestData } from '../fixtures/rls-test-data';

test('fixture creation works', async () => {
  const serviceClient = createServiceRoleClient();

  try {
    console.log('Creating test workspaces...');
    await createTestWorkspaces(serviceClient);

    console.log('Checking workspace1 admin user...');
    const admin = TEST_WORKSPACES.workspace1.users.admin;
    console.log('Admin user:', {
      email: admin.email,
      supabaseUserId: admin.supabaseUserId,
    });

    expect(admin.supabaseUserId).toBeDefined();
    expect(admin.supabaseUserId).not.toBe('');

    // Check if user exists in Supabase auth
    const { data: authUser, error } = await serviceClient.auth.admin.getUserById(admin.supabaseUserId);

    console.log('Auth user check result:', { authUser, error });

    expect(error).toBeNull();
    expect(authUser?.user?.id).toBe(admin.supabaseUserId);

  } finally {
    console.log('Cleaning up test data...');
    await cleanupTestData(serviceClient);
  }
});
