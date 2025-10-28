/**
 * Supabase Test Client Helpers
 *
 * Provides Supabase client initialization for testing with proper auth contexts.
 * This enables API/database tests that work with RLS policies.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error(
    'Missing required Supabase environment variables. Check .env file.'
  );
}

/**
 * Create a Supabase client for authenticated tests
 * Uses anon key and requires auth session setup
 */
export function createTestClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client with service role for fixture management
 * Bypasses RLS - use only for test setup/teardown
 */
export function createServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
