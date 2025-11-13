/**
 * User & Membership Factory
 *
 * Creates users with workspace memberships and Supabase auth
 * Handles the complexity of coordinating Prisma and Supabase
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  ensureAuthUser,
  DEFAULT_PASSWORD,
  AuthProvisioningContext,
} from "../auth-provisioning";
import type { Role } from "../../types";

export interface UserData {
  id?: string;
  email: string;
  name?: string;
  supabaseUserId?: string;
  isPending?: boolean;
  permissions?: string[];
}

export interface WorkspaceMembershipData {
  workspaceId: string;
  role: Role;
  isPrimary?: boolean;
  preferences?: any;
}

export interface UserWithMembershipData extends UserData {
  memberships: WorkspaceMembershipData[];
}

export interface UserFactoryOptions {
  prisma?: PrismaClient;
  password?: string;
  authContext?: AuthProvisioningContext;
  createAuth?: boolean; // Default: true
}

/**
 * Create a user with Supabase auth and workspace memberships
 *
 * @param data - User data with memberships
 * @param options - Factory options
 * @returns Created user with memberships
 */
export async function createUserWithMemberships(
  data: UserWithMembershipData,
  options: UserFactoryOptions = {},
) {
  const prisma = options.prisma || (await import("../../prisma")).prisma;
  const password = options.password || DEFAULT_PASSWORD;
  const createAuth = options.createAuth !== false;

  let supabaseUserId = data.supabaseUserId;

  // Create Supabase auth user if needed
  if (createAuth && !supabaseUserId) {
    const authResult = await ensureAuthUser(
      {
        email: data.email,
        password,
        metadata: {
          name: data.name,
          role: data.memberships[0]?.role, // Use first membership role
        },
      },
      options.authContext,
    );
    supabaseUserId = authResult.userId;
  }

  // Create user record
  const permissions = data.permissions || [];
  const user = await prisma.user.create({
    data: {
      id: data.id || randomUUID(),
      email: data.email,
      supabaseUserId,
      isPending: data.isPending ?? false,
      permissions,
      platformSuperAdmin: permissions.includes('platform_super_admin'),
      tenantId: await getTenantIdForWorkspace(
        data.memberships.find((m) => m.isPrimary)?.workspaceId,
        prisma,
      ),
    },
  });

  // Create workspace memberships
  const memberships = [];
  for (const membership of data.memberships) {
    const created = await prisma.workspaceMembership.create({
      data: {
        userId: user.id,
        workspaceId: membership.workspaceId,
        supabaseUserId: supabaseUserId || undefined,
        role: membership.role,
        isPrimary: membership.isPrimary ?? false,
        preferences: membership.preferences || undefined,
      },
    });
    memberships.push(created);
  }

  return {
    user,
    memberships,
  };
}

/**
 * Create multiple users with memberships
 *
 * @param users - Array of user data
 * @param options - Factory options
 * @returns Array of created users with memberships
 */
export async function createUsersWithMemberships(
  users: UserWithMembershipData[],
  options: UserFactoryOptions = {},
) {
  const results = [];
  for (const userData of users) {
    const created = await createUserWithMemberships(userData, options);
    results.push(created);
  }
  return results;
}

/**
 * Get tenant ID for a workspace
 * Helper function for legacy tenantId field
 */
async function getTenantIdForWorkspace(
  workspaceId: string | undefined,
  prisma: PrismaClient,
): Promise<string> {
  if (!workspaceId) return "default";

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { slug: true },
  });

  return workspace?.slug || "default";
}

/**
 * Default user preferences for primary workspace membership
 */
export const DEFAULT_USER_PREFERENCES = {
  notifications: {
    frequency: "daily",
    types: ["enrollment_updates", "new_challenges", "invite_sent"],
    quietHours: { start: "20:00", end: "08:00" },
  },
  privacy: {
    showInLeaderboard: true,
    allowAdminDM: true,
  },
  participation: {
    defaultLandingView: "dashboard",
    challengeInterests: ["innovation", "wellness", "sustainability"],
  },
  locale: {
    timezone: "America/New_York",
    weekStart: "monday",
    timeFormat: "12h",
  },
};
