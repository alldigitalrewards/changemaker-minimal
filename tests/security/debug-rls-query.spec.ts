/**
 * Debug test to check if RLS policies work with authenticated clients
 */

import { test, expect } from '@playwright/test';
import { createServiceRoleClient, createAuthenticatedClient } from '../utils/supabase-auth-test';
import { v4 as uuidv4 } from 'uuid';

test('debug RLS workspace query', async () => {
  const serviceClient = createServiceRoleClient();

  // Create Supabase auth user
  const email = `debug-${Date.now()}@test.com`;
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create auth user: ${authError?.message}`);
  }

  const supabaseUserId = authData.user.id;
  console.log('Created Supabase auth user:', supabaseUserId);

  // Define these outside try block so cleanup can access them
  const workspaceId = uuidv4();
  const userId = uuidv4();

  try {
    // Create workspace using service role (bypasses RLS)
    const { error: workspaceError } = await serviceClient
      .from('Workspace')
      .insert({
        id: workspaceId,
        slug: `debug-${Date.now()}`,
        name: 'Debug Workspace',
      });

    if (workspaceError) {
      throw new Error(`Failed to create workspace: ${JSON.stringify(workspaceError)}`);
    }

    console.log('Created workspace:', workspaceId);

    // Create User record using service role
    const { error: userError } = await serviceClient
      .from('User')
      .insert({
        id: userId,
        email,
        supabaseUserId,
        workspaceId,
        role: 'ADMIN',
      });

    if (userError) {
      throw new Error(`Failed to create User record: ${JSON.stringify(userError)}`);
    }

    console.log('Created User record:', userId);

    // Create WorkspaceMembership using service role
    const { error: membershipError } = await serviceClient
      .from('WorkspaceMembership')
      .insert({
        id: uuidv4(),
        userId,
        workspaceId,
        supabaseUserId, // Add supabaseUserId for RLS helper function
        role: 'ADMIN',
      });

    if (membershipError) {
      throw new Error(`Failed to create membership: ${JSON.stringify(membershipError)}`);
    }

    console.log('Created WorkspaceMembership');

    // Now try to query using authenticated client
    const authClient = await createAuthenticatedClient({
      email,
      supabaseUserId,
      workspaceId,
      id: userId,
      role: 'ADMIN',
    });

    console.log('Created authenticated client');

    // Check the session to verify auth context
    const { data: sessionData } = await authClient.auth.getSession();
    console.log('Auth session:', {
      hasSession: !!sessionData.session,
      userId: sessionData.session?.user?.id,
      role: sessionData.session?.user?.role,
    });

    // Test the function directly to see what it returns
    const { data: functionResult, error: functionError } = await authClient.rpc(
      'user_workspace_ids_no_rls'
    );
    console.log('Function result:', { functionResult, functionError });

    // Try to query workspaces with RLS
    const { data: workspaces, error: queryError } = await authClient
      .from('Workspace')
      .select('*');

    console.log('Query result:', { workspaces, queryError });

    expect(queryError).toBeNull();
    expect(workspaces).toBeDefined();
    expect(workspaces?.length).toBeGreaterThan(0);

  } finally {
    // Cleanup
    await serviceClient.from('WorkspaceMembership').delete().eq('userId', userId);
    await serviceClient.from('User').delete().eq('id', userId);
    await serviceClient.from('Workspace').delete().eq('id', workspaceId);
    await serviceClient.auth.admin.deleteUser(supabaseUserId);
  }
});
