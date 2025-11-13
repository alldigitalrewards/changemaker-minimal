/**
 * Seed Profiles
 *
 * Defines different seeding scenarios for development and testing:
 * - minimal: Quick setup for rapid iteration (1 workspace, 3 users)
 * - demo: Full-featured demo like current staging (3 workspaces, full data)
 * - full: Production-like volume for performance testing
 */

import { PrismaClient } from "@prisma/client";
import {
  createWorkspaces,
  createUsersWithMemberships,
  createChallengesForWorkspaces,
  DEFAULT_WORKSPACES,
  DEFAULT_USER_PREFERENCES,
  DEFAULT_PASSWORD,
  type UserWithMembershipData,
} from "../factories";

export type SeedProfile = "minimal" | "demo" | "full";

export interface SeedProfileOptions {
  prisma?: PrismaClient;
  clearData?: boolean; // Default: true
}

export interface SeedResult {
  workspaces: any[];
  users: any[];
  challenges: Record<string, any[]>;
  stats: {
    workspaceCount: number;
    userCount: number;
    challengeCount: number;
    membershipCount: number;
  };
}

/**
 * Run a seed profile
 *
 * @param profile - Profile name
 * @param options - Seed options
 * @returns Seed result with created data
 */
export async function runSeedProfile(
  profile: SeedProfile,
  options: SeedProfileOptions = {},
): Promise<SeedResult> {
  const prisma = options.prisma || (await import("../../prisma")).prisma;
  const clearData = options.clearData !== false;

  // Clear existing data if requested
  if (clearData) {
    await clearSeedData(prisma);
  }

  // Run profile-specific seed
  switch (profile) {
    case "minimal":
      return await seedMinimalProfile(prisma);
    case "demo":
      return await seedDemoProfile(prisma);
    case "full":
      return await seedFullProfile(prisma);
    default:
      throw new Error(`Unknown seed profile: ${profile}`);
  }
}

/**
 * Minimal Profile: 1 workspace, 3 users, 1 challenge
 * Fast setup for rapid development iteration
 */
async function seedMinimalProfile(prisma: PrismaClient): Promise<SeedResult> {
  console.log("🌱 Running minimal seed profile...");

  // Create single workspace
  const workspaces = await createWorkspaces(
    [DEFAULT_WORKSPACES[1]], // AllDigitalRewards
    { prisma },
  );
  const workspace = workspaces[0];

  console.log(`✓ Created workspace: ${workspace.name}`);

  // Create minimal users: 1 admin, 1 manager, 1 participant
  const users: UserWithMembershipData[] = [
    {
      email: "admin@test.com",
      name: "Admin User",
      memberships: [
        {
          workspaceId: workspace.id,
          role: "ADMIN",
          isPrimary: true,
          preferences: DEFAULT_USER_PREFERENCES,
        },
      ],
    },
    {
      email: "manager@test.com",
      name: "Manager User",
      memberships: [
        {
          workspaceId: workspace.id,
          role: "MANAGER",
          isPrimary: true,
        },
      ],
    },
    {
      email: "participant@test.com",
      name: "Participant User",
      memberships: [
        {
          workspaceId: workspace.id,
          role: "PARTICIPANT",
          isPrimary: true,
        },
      ],
    },
  ];

  const createdUsers = await createUsersWithMemberships(users, {
    prisma,
    password: DEFAULT_PASSWORD,
  });

  console.log(`✓ Created ${createdUsers.length} users`);

  // Create single challenge
  const challenges = await createChallengesForWorkspaces([workspace.id], 1, {
    prisma,
  });

  console.log(`✓ Created 1 challenge`);

  return {
    workspaces,
    users: createdUsers.map((u) => u.user),
    challenges,
    stats: {
      workspaceCount: workspaces.length,
      userCount: createdUsers.length,
      challengeCount: 1,
      membershipCount: createdUsers.reduce(
        (sum, u) => sum + u.memberships.length,
        0,
      ),
    },
  };
}

/**
 * Demo Profile: 3 workspaces, full roles, multiple challenges
 * Matches current staging seed - comprehensive demo data
 */
async function seedDemoProfile(prisma: PrismaClient): Promise<SeedResult> {
  console.log("🌱 Running demo seed profile...");

  // Create all default workspaces
  const workspaces = await createWorkspaces(DEFAULT_WORKSPACES, { prisma });

  console.log(`✓ Created ${workspaces.length} workspaces`);

  // Create comprehensive user set
  const users: UserWithMembershipData[] = [];

  // Platform admins (multi-workspace)
  const adminEmails = [
    "krobinson@alldigitalrewards.com",
    "kfelke@alldigitalrewards.com",
    "jfelke@alldigitalrewards.com",
    "jhoughtelin@alldigitalrewards.com",
  ];

  for (const email of adminEmails) {
    const name = email.split("@")[0].replace(".", " ").toUpperCase();
    users.push({
      email,
      name,
      permissions:
        email === "jfelke@alldigitalrewards.com" ||
        email === "krobinson@alldigitalrewards.com"
          ? ["platform_super_admin"]
          : [],
      memberships: [
        {
          workspaceId: workspaces[1].id, // AllDigitalRewards primary
          role: "ADMIN",
          isPrimary: true,
          preferences: DEFAULT_USER_PREFERENCES,
        },
      ],
    });
  }

  // Workspace-specific managers and participants
  for (const workspace of workspaces) {
    const slug = workspace.slug;

    // 1 manager per workspace
    users.push({
      email: `manager@${slug}.com`,
      name: `${workspace.name} Manager`,
      memberships: [
        {
          workspaceId: workspace.id,
          role: "MANAGER",
          isPrimary: true,
        },
      ],
    });

    // 3 participants per workspace
    for (let i = 1; i <= 3; i++) {
      users.push({
        email: `participant${i}@${slug}.com`,
        name: `${workspace.name} Participant ${i}`,
        memberships: [
          {
            workspaceId: workspace.id,
            role: "PARTICIPANT",
            isPrimary: true,
          },
        ],
      });
    }
  }

  const createdUsers = await createUsersWithMemberships(users, {
    prisma,
    password: DEFAULT_PASSWORD,
  });

  console.log(`✓ Created ${createdUsers.length} users`);

  // Create 3-4 challenges per workspace (deterministic)
  const challenges = await createChallengesForWorkspaces(
    workspaces.map((w) => w.id),
    4,
    { prisma },
  );

  const challengeCount = Object.values(challenges).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  console.log(`✓ Created ${challengeCount} challenges`);

  return {
    workspaces,
    users: createdUsers.map((u) => u.user),
    challenges,
    stats: {
      workspaceCount: workspaces.length,
      userCount: createdUsers.length,
      challengeCount,
      membershipCount: createdUsers.reduce(
        (sum, u) => sum + u.memberships.length,
        0,
      ),
    },
  };
}

/**
 * Full Profile: Production-like volume
 * For load testing and performance validation
 */
async function seedFullProfile(prisma: PrismaClient): Promise<SeedResult> {
  console.log("🌱 Running full seed profile...");

  // Create all default workspaces + 7 more
  const workspaces = await createWorkspaces(
    [
      ...DEFAULT_WORKSPACES,
      { slug: "startup1", name: "Startup One" },
      { slug: "startup2", name: "Startup Two" },
      { slug: "enterprise1", name: "Enterprise One" },
      { slug: "enterprise2", name: "Enterprise Two" },
      { slug: "nonprofit1", name: "Nonprofit One" },
      { slug: "nonprofit2", name: "Nonprofit Two" },
      { slug: "education1", name: "Education One" },
    ],
    { prisma },
  );

  console.log(`✓ Created ${workspaces.length} workspaces`);

  // Create large user set (10 per workspace)
  const users: UserWithMembershipData[] = [];

  for (const workspace of workspaces) {
    const slug = workspace.slug;

    // 2 admins
    for (let i = 1; i <= 2; i++) {
      users.push({
        email: `admin${i}@${slug}.com`,
        name: `${workspace.name} Admin ${i}`,
        memberships: [
          {
            workspaceId: workspace.id,
            role: "ADMIN",
            isPrimary: true,
          },
        ],
      });
    }

    // 2 managers
    for (let i = 1; i <= 2; i++) {
      users.push({
        email: `manager${i}@${slug}.com`,
        name: `${workspace.name} Manager ${i}`,
        memberships: [
          {
            workspaceId: workspace.id,
            role: "MANAGER",
            isPrimary: true,
          },
        ],
      });
    }

    // 6 participants
    for (let i = 1; i <= 6; i++) {
      users.push({
        email: `participant${i}@${slug}.com`,
        name: `${workspace.name} Participant ${i}`,
        memberships: [
          {
            workspaceId: workspace.id,
            role: "PARTICIPANT",
            isPrimary: true,
          },
        ],
      });
    }
  }

  const createdUsers = await createUsersWithMemberships(users, {
    prisma,
    password: DEFAULT_PASSWORD,
  });

  console.log(`✓ Created ${createdUsers.length} users`);

  // Create 5 challenges per workspace
  const challenges = await createChallengesForWorkspaces(
    workspaces.map((w) => w.id),
    5,
    { prisma },
  );

  const challengeCount = Object.values(challenges).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  console.log(`✓ Created ${challengeCount} challenges`);

  return {
    workspaces,
    users: createdUsers.map((u) => u.user),
    challenges,
    stats: {
      workspaceCount: workspaces.length,
      userCount: createdUsers.length,
      challengeCount,
      membershipCount: createdUsers.reduce(
        (sum, u) => sum + u.memberships.length,
        0,
      ),
    },
  };
}

/**
 * Clear all seed data
 * Safe to call before seeding to ensure clean state
 */
async function clearSeedData(prisma: PrismaClient): Promise<void> {
  console.log("🗑️  Clearing existing seed data...");

  // Delete in reverse order of dependencies
  await prisma.activityEvent.deleteMany();
  await prisma.workspaceCommunication.deleteMany();
  await prisma.pointsLedger.deleteMany();
  await prisma.rewardIssuance.deleteMany();
  await prisma.activitySubmission.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.activityTemplate.deleteMany();
  await prisma.challengePointsBudget.deleteMany();
  await prisma.challengeAssignment.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.inviteRedemption.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.pointsBalance.deleteMany();
  await prisma.workspaceMembership.deleteMany();
  await prisma.workspaceEmailTemplate.deleteMany();
  await prisma.workspaceEmailSettings.deleteMany();
  await prisma.workspaceParticipantSegment.deleteMany();
  await prisma.workspacePointsBudget.deleteMany();
  await (prisma as any).tenantSku.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  // Clear Supabase Auth users
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Delete all auth users
    let page = 1;
    const perPage = 1000;
    let deletedCount = 0;

    while (page < 10) {
      // Max 10 pages = 10,000 users
      const { data: userData } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (!userData?.users || userData.users.length === 0) break;

      // Delete users in batch
      for (const user of userData.users) {
        await supabase.auth.admin.deleteUser(user.id);
        deletedCount++;
      }

      page++;
    }

    if (deletedCount > 0) {
      console.log(`✓ Deleted ${deletedCount} Supabase Auth users`);
    }
  } catch (error) {
    console.warn("⚠️  Could not clear Supabase Auth users:", error);
  }

  console.log("✓ Cleared all seed data");
}
