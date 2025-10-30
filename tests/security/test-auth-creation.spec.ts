/**
 * Debug test to check why Supabase auth user creation might be failing
 */

import { test } from '@playwright/test';
import { createServiceRoleClient } from '../utils/supabase-auth-test';

test('create single Supabase auth user', async () => {
  const client = createServiceRoleClient();

  const { data, error } = await client.auth.admin.createUser({
    email: 'debug-test@test.com',
    password: 'test-password-123',
    email_confirm: true,
  });

  console.log('Create user result:', {
    data,
    error,
    userId: data?.user?.id,
  });

  if (error) {
    console.error('Error creating user:', error);
  } else {
    console.log('User created successfully with ID:', data.user.id);

    // Verify user exists
    const { data: lookupData, error: lookupError } = await client.auth.admin.getUserById(data.user.id);

    console.log('Lookup result:', {
      lookupData,
      lookupError,
    });

    // Cleanup
    await client.auth.admin.deleteUser(data.user.id);
  }
});
