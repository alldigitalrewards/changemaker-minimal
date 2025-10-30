/**
 * Auth Context Helpers
 *
 * Manages authentication context for tests, providing helpers to login
 * as different users/roles and establish proper JWT sessions.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createTestClient, createServiceClient } from './supabase-client';

export const DEFAULT_PASSWORD = 'Changemaker2025!';

export interface AuthSession {
  client: SupabaseClient;
  session: any;
  user: any;
}

/**
 * Login as a specific user by email
 * Returns authenticated Supabase client with JWT session
 */
export async function loginAs(email: string, password: string = DEFAULT_PASSWORD): Promise<AuthSession> {
  const client = createTestClient();

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error(`Failed to login as ${email}: ${error?.message || 'No session returned'}`);
  }

  return {
    client,
    session: data.session,
    user: data.user,
  };
}

/**
 * Login as admin user for a workspace
 */
export async function loginAsAdmin(workspaceSlug: string): Promise<AuthSession> {
  // Get admin user for workspace from database
  const serviceClient = createServiceClient();

  const { data: workspace } = await serviceClient
    .from('Workspace')
    .select('id')
    .eq('slug', workspaceSlug)
    .single();

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceSlug}`);
  }

  const { data: membership } = await serviceClient
    .from('WorkspaceMembership')
    .select('User(email)')
    .eq('workspaceId', workspace.id)
    .eq('role', 'ADMIN')
    .limit(1)
    .single();

  if (!membership?.User) {
    throw new Error(`No admin found for workspace: ${workspaceSlug}`);
  }

  const email = (membership.User as any).email;
  return loginAs(email);
}

/**
 * Login as manager user for a workspace
 */
export async function loginAsManager(workspaceSlug: string): Promise<AuthSession> {
  const serviceClient = createServiceClient();

  const { data: workspace } = await serviceClient
    .from('Workspace')
    .select('id')
    .eq('slug', workspaceSlug)
    .single();

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceSlug}`);
  }

  const { data: membership } = await serviceClient
    .from('WorkspaceMembership')
    .select('User(email)')
    .eq('workspaceId', workspace.id)
    .eq('role', 'MANAGER')
    .limit(1)
    .single();

  if (!membership?.User) {
    throw new Error(`No manager found for workspace: ${workspaceSlug}`);
  }

  const email = (membership.User as any).email;
  return loginAs(email);
}

/**
 * Login as participant user for a workspace
 */
export async function loginAsParticipant(workspaceSlug: string): Promise<AuthSession> {
  const serviceClient = createServiceClient();

  const { data: workspace } = await serviceClient
    .from('Workspace')
    .select('id')
    .eq('slug', workspaceSlug)
    .single();

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceSlug}`);
  }

  const { data: membership } = await serviceClient
    .from('WorkspaceMembership')
    .select('User(email)')
    .eq('workspaceId', workspace.id)
    .eq('role', 'PARTICIPANT')
    .limit(1)
    .single();

  if (!membership?.User) {
    throw new Error(`No participant found for workspace: ${workspaceSlug}`);
  }

  const email = (membership.User as any).email;
  return loginAs(email);
}

/**
 * Logout and clear auth session
 */
export async function logout(authSession: AuthSession): Promise<void> {
  await authSession.client.auth.signOut();
}

/**
 * Create a test user with Supabase auth
 * Use service client for this operation
 */
export async function createTestUser(email: string, password: string = DEFAULT_PASSWORD): Promise<string> {
  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      test_user: true,
    },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user ${email}: ${error?.message}`);
  }

  return data.user.id;
}

/**
 * Delete a test user from Supabase auth
 */
export async function deleteTestUser(supabaseUserId: string): Promise<void> {
  const serviceClient = createServiceClient();

  const { error } = await serviceClient.auth.admin.deleteUser(supabaseUserId);

  if (error) {
    console.warn(`Failed to delete test user ${supabaseUserId}: ${error.message}`);
  }
}
