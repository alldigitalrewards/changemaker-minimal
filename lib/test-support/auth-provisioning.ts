/**
 * Centralized Auth Provisioning
 *
 * Provides a unified interface for creating Supabase auth users across
 * seed scripts, test fixtures, and development workflows.
 *
 * Features:
 * - Idempotent user creation (safe to run multiple times)
 * - Support for test and production contexts
 * - Optional mocking for unit tests
 * - Consistent error handling
 */

import { SupabaseClient, createClient } from "@supabase/supabase-js";

export interface AuthProvisioningOptions {
  email: string;
  password: string;
  metadata?: Record<string, any>;
  emailConfirm?: boolean;
}

export interface AuthProvisioningResult {
  userId: string;
  created: boolean;
}

/**
 * Default password for all seed and test users
 * @public
 */
export const DEFAULT_PASSWORD = "Changemaker2025!";

/**
 * Auth provisioning context
 * Allows dependency injection for testing
 */
export interface AuthProvisioningContext {
  supabaseClient?: SupabaseClient;
  mock?: boolean;
}

/**
 * Get or create a Supabase auth user
 *
 * This function is idempotent - it will:
 * 1. Try to create a new user
 * 2. If user exists, find and optionally update them
 * 3. Return the user ID and creation status
 *
 * @param options - User creation options
 * @param context - Optional context for dependency injection
 * @returns User ID and whether user was newly created
 */
export async function ensureAuthUser(
  options: AuthProvisioningOptions,
  context: AuthProvisioningContext = {},
): Promise<AuthProvisioningResult> {
  const { email, password, metadata = {}, emailConfirm = true } = options;

  // Mock mode for unit tests
  if (context.mock) {
    const mockId = `mock-${Buffer.from(email).toString("base64").substring(0, 20)}`;
    return { userId: mockId, created: true };
  }

  // Get Supabase client (injected or from environment)
  const supabase =
    context.supabaseClient ||
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

  try {
    // Attempt to create the user
    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: emailConfirm,
        user_metadata: metadata,
      });

    if (createData?.user) {
      return { userId: createData.user.id, created: true };
    }

    // User already exists - find and return existing user
    if (
      createError?.message?.includes("already been registered") ||
      createError?.message?.includes("already exists")
    ) {
      const { data: userData } = await supabase.auth.admin.listUsers();
      const existingUser = userData?.users?.find((u) => u.email === email);

      if (existingUser) {
        // Optionally update metadata
        if (Object.keys(metadata).length > 0) {
          await supabase.auth.admin.updateUserById(existingUser.id, {
            user_metadata: metadata,
          });
        }

        return { userId: existingUser.id, created: false };
      }
    }

    // Failed to create or find user
    throw new Error(
      `Failed to create/get auth user ${email}: ${createError?.message || "Unknown error"}`,
    );
  } catch (error) {
    throw new Error(
      `Error provisioning auth user ${email}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Batch create auth users
 * More efficient than calling ensureAuthUser multiple times
 *
 * @param users - Array of user options
 * @param context - Optional context for dependency injection
 * @returns Array of user IDs in same order as input
 */
export async function ensureAuthUsers(
  users: AuthProvisioningOptions[],
  context: AuthProvisioningContext = {},
): Promise<AuthProvisioningResult[]> {
  const results: AuthProvisioningResult[] = [];

  for (const user of users) {
    const result = await ensureAuthUser(user, context);
    results.push(result);
  }

  return results;
}

/**
 * Delete a Supabase auth user
 * Used for test cleanup
 *
 * @param userId - Supabase user ID
 * @param context - Optional context for dependency injection
 */
export async function deleteAuthUser(
  userId: string,
  context: AuthProvisioningContext = {},
): Promise<void> {
  if (context.mock) {
    return; // No-op in mock mode
  }

  const supabase =
    context.supabaseClient ||
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch (error) {
    // Ignore if user doesn't exist
    console.warn(`Could not delete auth user ${userId}: ${error}`);
  }
}
