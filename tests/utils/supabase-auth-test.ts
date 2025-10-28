/**
 * Supabase Authentication Test Utilities
 *
 * This module provides utilities for testing RLS policies with proper Supabase
 * authentication contexts. It handles JWT token generation and auth session setup.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { TestUser } from '../fixtures/rls-test-data';

// Supabase configuration from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !JWT_SECRET) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET'
  );
}

/**
 * JWT Claims for Supabase authentication
 */
interface JWTClaims {
  iss: string; // Issuer - Supabase project URL
  role: 'authenticated' | 'anon' | 'service_role';
  sub: string; // User ID (Supabase auth user ID)
  aud: string;
  exp: number;
  iat: number;
  email: string;
  phone?: string;
  aal: string; // Authenticator assurance level
  session_id?: string;
  is_anonymous?: boolean;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

/**
 * Generate a JWT token for testing RLS policies
 *
 * @param user Test user with Supabase auth ID
 * @param expiresInSeconds Token expiration time (default: 1 hour)
 * @returns Signed JWT token
 */
export function generateTestJWT(user: TestUser, expiresInSeconds: number = 3600): string {
  const now = Math.floor(Date.now() / 1000);

  const claims: JWTClaims = {
    iss: `${SUPABASE_URL}/auth/v1`,
    role: 'authenticated',
    sub: user.supabaseUserId,
    aud: 'authenticated',
    exp: now + expiresInSeconds,
    iat: now,
    email: user.email,
    phone: '',
    aal: 'aal1',
    session_id: uuidv4(),
    is_anonymous: false,
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {
      test_user: true,
    },
  };

  // Note: Don't pass expiresIn option when exp is already in claims
  return jwt.sign(claims, JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Create a Supabase client with service role access
 * Used for fixture setup/cleanup that bypasses RLS
 *
 * @returns Supabase client with service role
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client authenticated as a specific test user
 * Used for testing RLS policies with proper auth context
 *
 * @param user Test user to authenticate as
 * @returns Supabase client with user's auth context
 */
export async function createAuthenticatedClient(user: TestUser): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Sign in with password using the test credentials
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: 'test-password-123', // Must match password used in fixture creation
  });

  if (error) {
    throw new Error(`Failed to sign in user ${user.email}: ${error.message}`);
  }

  if (!data.session) {
    throw new Error(`No session returned for user ${user.email}`);
  }

  return client;
}

/**
 * Clear authentication session from a Supabase client
 *
 * @param client Supabase client to clear auth from
 */
export async function clearAuthSession(client: SupabaseClient): Promise<void> {
  await client.auth.signOut();
}

/**
 * Helper to create Supabase auth users for testing
 * Called during test fixture setup
 *
 * @param serviceClient Supabase client with service role
 * @param email User email
 * @param password User password
 * @returns Created user's Supabase auth ID
 */
export async function createSupabaseAuthUser(
  serviceClient: SupabaseClient,
  email: string,
  password: string = 'test-password-123'
): Promise<string> {
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      test_user: true,
    },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create Supabase auth user for ${email}: ${error?.message}`);
  }

  return data.user.id;
}

/**
 * Helper to delete Supabase auth users during cleanup
 *
 * @param serviceClient Supabase client with service role
 * @param supabaseUserId Supabase auth user ID to delete
 */
export async function deleteSupabaseAuthUser(
  serviceClient: SupabaseClient,
  supabaseUserId: string
): Promise<void> {
  const { error } = await serviceClient.auth.admin.deleteUser(supabaseUserId);

  if (error) {
    console.warn(`Failed to delete Supabase auth user ${supabaseUserId}: ${error.message}`);
  }
}
