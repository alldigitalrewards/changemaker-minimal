/**
 * Database Seed Script
 * Populates the database with default workspaces, users, and mock data
 * Updated to support WorkspaceMembership for multi-workspace testing
 */

import {
  PrismaClient,
  EnrollmentStatus,
  ActivityEventType,
  Prisma,
  RewardType,
} from "@prisma/client";
import { type Role, ROLE_ADMIN, ROLE_PARTICIPANT } from "../lib/types";
import { awardPointsWithBudget } from "../lib/db/queries";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

// Load environment variables
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

// Initialize Supabase Admin client for user creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // You'll need to add this to .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const DEFAULT_PASSWORD = "Changemaker2025!";

// Workspace data
const workspaces = [
  {
    slug: "acme",
    name: "ACME Corporation",
  },
  {
    slug: "alldigitalrewards",
    name: "AllDigitalRewards",
  },
  {
    slug: "sharecare",
    name: "Sharecare",
  },
];

// Admin users with multi-workspace configuration
const adminUsers = [
  {
    email: "krobinson@alldigitalrewards.com",
    name: "Kim Robinson",
    workspaceMemberships: [
      { workspace: "alldigitalrewards", isPrimary: true },
      { workspace: "acme", isPrimary: false },
      { workspace: "sharecare", isPrimary: false },
    ],
  },
  {
    email: "kfelke@alldigitalrewards.com",
    name: "Kathryn Felke",
    workspaceMemberships: [{ workspace: "alldigitalrewards", isPrimary: true }],
  },
  {
    email: "jfelke@alldigitalrewards.com",
    name: "Jack Felke",
    workspaceMemberships: [
      { workspace: "alldigitalrewards", isPrimary: true },
      { workspace: "acme", isPrimary: false },
    ],
  },
  {
    email: "jhoughtelin@alldigitalrewards.com",
    name: "Josh Houghtelin",
    workspaceMemberships: [
      { workspace: "alldigitalrewards", isPrimary: true },
      { workspace: "sharecare", isPrimary: false },
    ],
  },
];

// Manager users (one per workspace for Task 9)
const managerUsers = [
  { email: "sarah.manager@acme.com", name: "Sarah Manager", workspace: "acme" },
  {
    email: "tom.manager@alldigitalrewards.com",
    name: "Tom Manager",
    workspace: "alldigitalrewards",
  },
  {
    email: "lisa.manager@sharecare.com",
    name: "Lisa Manager",
    workspace: "sharecare",
  },
];

// Participant users (domain-specific) - More participants for fuller leaderboard
const participantUsers = [
  // ACME participants (10 total)
  { email: "john.doe@acme.com", name: "John Doe", workspace: "acme" },
  { email: "jane.smith@acme.com", name: "Jane Smith", workspace: "acme" },
  { email: "bob.wilson@acme.com", name: "Bob Wilson", workspace: "acme" },
  { email: "alice.cooper@acme.com", name: "Alice Cooper", workspace: "acme" },
  { email: "charlie.brown@acme.com", name: "Charlie Brown", workspace: "acme" },
  { email: "diana.prince@acme.com", name: "Diana Prince", workspace: "acme" },
  { email: "ethan.hunt@acme.com", name: "Ethan Hunt", workspace: "acme" },
  { email: "fiona.green@acme.com", name: "Fiona Green", workspace: "acme" },
  { email: "george.mason@acme.com", name: "George Mason", workspace: "acme" },
  { email: "hannah.white@acme.com", name: "Hannah White", workspace: "acme" },

  // AllDigitalRewards participants (10 total)
  {
    email: "sarah.jones@alldigitalrewards.com",
    name: "Sarah Jones",
    workspace: "alldigitalrewards",
  },
  {
    email: "mike.chen@alldigitalrewards.com",
    name: "Mike Chen",
    workspace: "alldigitalrewards",
  },
  {
    email: "lisa.taylor@alldigitalrewards.com",
    name: "Lisa Taylor",
    workspace: "alldigitalrewards",
  },
  {
    email: "robert.garcia@alldigitalrewards.com",
    name: "Robert Garcia",
    workspace: "alldigitalrewards",
  },
  {
    email: "emily.clark@alldigitalrewards.com",
    name: "Emily Clark",
    workspace: "alldigitalrewards",
  },
  {
    email: "james.martinez@alldigitalrewards.com",
    name: "James Martinez",
    workspace: "alldigitalrewards",
  },
  {
    email: "sophia.rodriguez@alldigitalrewards.com",
    name: "Sophia Rodriguez",
    workspace: "alldigitalrewards",
  },
  {
    email: "william.lee@alldigitalrewards.com",
    name: "William Lee",
    workspace: "alldigitalrewards",
  },
  {
    email: "olivia.walker@alldigitalrewards.com",
    name: "Olivia Walker",
    workspace: "alldigitalrewards",
  },
  {
    email: "daniel.hall@alldigitalrewards.com",
    name: "Daniel Hall",
    workspace: "alldigitalrewards",
  },

  // Sharecare participants (10 total)
  {
    email: "david.brown@sharecare.com",
    name: "David Brown",
    workspace: "sharecare",
  },
  {
    email: "emma.davis@sharecare.com",
    name: "Emma Davis",
    workspace: "sharecare",
  },
  {
    email: "alex.johnson@sharecare.com",
    name: "Alex Johnson",
    workspace: "sharecare",
  },
  {
    email: "maria.lopez@sharecare.com",
    name: "Maria Lopez",
    workspace: "sharecare",
  },
  {
    email: "kevin.white@sharecare.com",
    name: "Kevin White",
    workspace: "sharecare",
  },
  {
    email: "jennifer.adams@sharecare.com",
    name: "Jennifer Adams",
    workspace: "sharecare",
  },
  {
    email: "thomas.baker@sharecare.com",
    name: "Thomas Baker",
    workspace: "sharecare",
  },
  {
    email: "michelle.campbell@sharecare.com",
    name: "Michelle Campbell",
    workspace: "sharecare",
  },
  {
    email: "christopher.evans@sharecare.com",
    name: "Christopher Evans",
    workspace: "sharecare",
  },
  {
    email: "ashley.foster@sharecare.com",
    name: "Ashley Foster",
    workspace: "sharecare",
  },
];

// Sample challenges
const challengeTemplates = [
  {
    title: "Innovation Sprint 2025",
    description:
      "Propose and develop innovative solutions to improve our customer experience using AI and automation.",
  },
  {
    title: "Sustainability Challenge",
    description:
      "Create initiatives to reduce our carbon footprint and promote environmental responsibility.",
  },
  {
    title: "Wellness & Wellbeing",
    description:
      "Design programs that enhance employee wellness and work-life balance.",
  },
  {
    title: "Digital Transformation",
    description:
      "Identify opportunities to digitize and streamline our business processes.",
  },
  {
    title: "Community Outreach",
    description:
      "Develop partnerships and programs that give back to our local communities.",
  },
];

/**
 * Split a full name into firstName and lastName
 */
function splitFullName(fullName: string): { firstName: string; lastName: string | null } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }
  return {
    firstName: fullName.trim(),
    lastName: null
  };
}

/**
 * Get or create a Supabase user for seeding purposes.
 * Attempts to create the user; if the user already exists, updates password and metadata.
 *
 * @param email - Email address for the user
 * @param password - Initial password to set
 * @param metadata - Arbitrary user metadata to associate
 * @returns The created or existing Supabase user, or null on failure
 */
async function getOrCreateSupabaseUser(
  email: string,
  password: string,
  metadata: any = {},
) {
  try {
    // First, try to create the user
    const { data: createData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });

    if (createData?.user) {
      return createData.user;
    }

    // If user already exists (error code 'user_already_exists'), get the existing user
    if (createError?.message?.includes("already been registered")) {
      const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = userData?.users?.find((u) => u.email === email);

      if (existingUser) {
        // Update user metadata and password
        const { data: updateData } =
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password,
            user_metadata: metadata,
          });
        return updateData?.user || existingUser;
      }
    }

    console.error(`Failed to create/get user ${email}:`, createError);
    return null;
  } catch (error) {
    console.error(`Error with user ${email}:`, error);
    return null;
  }
}

/**
 * Seed the database with realistic demo data for local development.
 * The routine is largely idempotent via upserts, but it starts by clearing core tables
 * to ensure a clean, deterministic dataset for testing.
 */
async function seed() {
  try {
    console.log("🌱 Starting seed...\n");

    // Clear existing data (optional - comment out if you want to preserve data)
    console.log("🗑️  Clearing existing data...");
    await prisma.activityEvent.deleteMany();
    await prisma.workspaceCommunication.deleteMany();
    await prisma.pointsLedger.deleteMany();
    await prisma.rewardIssuance.deleteMany();
    await prisma.activitySubmission.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityTemplate.deleteMany();
    await prisma.challengePointsBudget.deleteMany();
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

    // Create workspaces with unique tenantId per workspace (multi-tenancy)
    console.log("🏢 Creating workspaces...");
    const createdWorkspaces = [];
    for (const workspace of workspaces) {
      const created = await prisma.workspace.create({
        data: {
          id: randomUUID(),
          slug: workspace.slug,
          name: workspace.name,
          tenantId: workspace.slug, // Each workspace is its own tenant
        },
      });
      createdWorkspaces.push(created);
      console.log(
        `✓ Created workspace: ${workspace.name} (tenant: ${workspace.slug})`,
      );
    }

    // Create admin users with WorkspaceMemberships
    console.log(
      "\n👤 Creating admin users with multi-workspace memberships...",
    );
    for (const admin of adminUsers) {
      // Get or create Supabase auth user
      const supabaseUser = await getOrCreateSupabaseUser(
        admin.email,
        DEFAULT_PASSWORD,
        { role: "ADMIN", name: admin.name },
      );

      if (supabaseUser) {
        // Split name into firstName and lastName
        const { firstName, lastName } = splitFullName(admin.name);

        // Create Prisma user
        const user = await prisma.user.upsert({
          where: { email: admin.email },
          update: {
            supabaseUserId: supabaseUser.id,
            firstName,
            lastName,
            displayName: admin.name,
            isPending: false, // Admins are not pending
            // Grant platform_super_admin to designated super admins for testing
            permissions:
              admin.email === "jfelke@alldigitalrewards.com" ||
              admin.email === "krobinson@alldigitalrewards.com"
                ? { set: ["platform_super_admin"] }
                : undefined,
            tenantId:
              admin.workspaceMemberships.find((m) => m.isPrimary)?.workspace ||
              "default",
          },
          create: {
            email: admin.email,
            supabaseUserId: supabaseUser.id,
            firstName,
            lastName,
            displayName: admin.name,
            isPending: false, // Admins are not pending
            permissions:
              admin.email === "jfelke@alldigitalrewards.com" ||
              admin.email === "krobinson@alldigitalrewards.com"
                ? ["platform_super_admin"]
                : [],
            tenantId:
              admin.workspaceMemberships.find((m) => m.isPrimary)?.workspace ||
              "default",
          },
        });

        // Create WorkspaceMemberships
        for (const membership of admin.workspaceMemberships) {
          const workspace = createdWorkspaces.find(
            (w) => w.slug === membership.workspace,
          );
          if (workspace) {
            await prisma.workspaceMembership.upsert({
              where: {
                userId_workspaceId: {
                  userId: user.id,
                  workspaceId: workspace.id,
                },
              },
              update: {
                role: 'ADMIN',
                isPrimary: membership.isPrimary,
                preferences: membership.isPrimary
                  ? {
                      notifications: {
                        frequency: "daily",
                        types: [
                          "enrollment_updates",
                          "new_challenges",
                          "invite_sent",
                        ],
                        quietHours: { start: "20:00", end: "08:00" },
                      },
                      privacy: {
                        showInLeaderboard: true,
                        allowAdminDM: true,
                      },
                      participation: {
                        defaultLandingView: "dashboard",
                        challengeInterests: [
                          "innovation",
                          "wellness",
                          "sustainability",
                        ],
                      },
                      locale: {
                        timezone: "America/New_York",
                        weekStart: "monday",
                        timeFormat: "12h",
                      },
                    }
                  : Prisma.JsonNull,
              },
              create: {
                userId: user.id,
                workspaceId: workspace.id,
                role: 'ADMIN',
                isPrimary: membership.isPrimary,
                preferences: membership.isPrimary
                  ? {
                      notifications: {
                        frequency: "daily",
                        types: [
                          "enrollment_updates",
                          "new_challenges",
                          "invite_sent",
                        ],
                        quietHours: { start: "20:00", end: "08:00" },
                      },
                      privacy: {
                        showInLeaderboard: true,
                        allowAdminDM: true,
                      },
                      participation: {
                        defaultLandingView: "dashboard",
                        challengeInterests: [
                          "innovation",
                          "wellness",
                          "sustainability",
                        ],
                      },
                      locale: {
                        timezone: "America/New_York",
                        weekStart: "monday",
                        timeFormat: "12h",
                      },
                    }
                  : Prisma.JsonNull,
              },
            });
            console.log(
              `  ✓ Added ${admin.email} to ${workspace.name}${membership.isPrimary ? " (primary)" : ""}`,
            );
          }
        }
        console.log(
          `✓ Created admin: ${admin.email} with ${admin.workspaceMemberships.length} workspace(s)`,
        );
      } else {
        console.error(
          `❌ Failed to create/retrieve admin user: ${admin.email}`,
        );
      }
    }

    // Create sample invite codes for each workspace (after we have admin users to be creators)
    console.log("\n📨 Creating sample invite codes...");
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get the first admin user to be the creator of invite codes
    const firstAdminMembership = await prisma.workspaceMembership.findFirst({
      where: { role: 'ADMIN' },
      include: { User: true },
    });
    const firstAdmin = firstAdminMembership?.User;
    // Safe nullable admin ID used anywhere an actor/updatedBy/createdBy is optional
    const adminUserId = firstAdmin?.id ?? null;

    if (firstAdmin) {
      // Create workspace email settings
      console.log("\n📧 Creating workspace email settings...");
      for (const workspace of createdWorkspaces) {
        await prisma.workspaceEmailSettings.create({
          data: {
            id: randomUUID(),
            workspaceId: workspace.id,
            fromName: `${workspace.name} Team`,
            fromEmail: `no-reply@${workspace.slug}.com`,
            replyTo: `support@${workspace.slug}.com`,
            footerHtml: `<p>© 2025 ${workspace.name}. All rights reserved.</p>`,
            brandColor: "#FF6B6B", // Coral color from theme
            updatedBy: adminUserId,
          },
        });
        console.log(`✓ Created email settings for ${workspace.name}`);

        // Create sample email templates
        await prisma.workspaceEmailTemplate.create({
          data: {
            id: randomUUID(),
            workspaceId: workspace.id,
            type: "INVITE",
            subject: `Welcome to ${workspace.name} Challenges!`,
            html: `<h1>Welcome!</h1><p>You've been invited to join {{challenge.title}}.</p>`,
            enabled: true,
            updatedBy: adminUserId,
          },
        });

        await prisma.workspaceEmailTemplate.create({
          data: {
            id: randomUUID(),
            workspaceId: workspace.id,
            type: "ENROLLMENT_UPDATE",
            subject: `Your enrollment status has been updated`,
            html: `<p>Your enrollment in {{challenge.title}} has been updated to {{enrollment.status}}.</p>`,
            enabled: true,
            updatedBy: adminUserId,
          },
        });
        console.log(`✓ Created email templates for ${workspace.name}`);

        // Create participant segments
        await prisma.workspaceParticipantSegment.create({
          data: {
            workspaceId: workspace.id,
            name: "Active Participants",
            description: "Users enrolled in at least one challenge",
            filterJson: { status: "ENROLLED" },
            createdBy: adminUserId!,
          },
        });

        await prisma.workspaceParticipantSegment.create({
          data: {
            workspaceId: workspace.id,
            name: "High Achievers",
            description: "Users with 100+ points",
            filterJson: { points: { min: 100 } },
            createdBy: adminUserId!,
          },
        });
        console.log(`✓ Created participant segments for ${workspace.name}`);
      }

      // Create workspace points budgets (ensure exists)
      console.log("\n💰 Creating workspace points budgets...");
      for (const workspace of createdWorkspaces) {
        await prisma.workspacePointsBudget.upsert({
          where: { workspaceId: workspace.id },
          update: {
            totalBudget: 10000,
            updatedBy: adminUserId,
          },
          create: {
            workspaceId: workspace.id,
            totalBudget: 10000,
            allocated: 0,
            updatedBy: adminUserId,
          },
        });
        console.log(
          `✓ Created points budget for ${workspace.name}: 10,000 points`,
        );
      }

      console.log("\n📨 Creating sample invite codes...");
      for (const workspace of createdWorkspaces) {
        // Create a general invite code
        await prisma.inviteCode.create({
          data: {
            id: randomUUID(),
            code: `${workspace.slug.toUpperCase()}-WELCOME-2025`,
            workspaceId: workspace.id,
            createdBy: adminUserId!,
            maxUses: 100,
            usedCount: 0,
            expiresAt: thirtyDaysFromNow,
          },
        });
        console.log(
          `✓ Created general invite code for ${workspace.name}: ${workspace.slug.toUpperCase()}-WELCOME-2025`,
        );

        // Create a targeted invite code for testing
        await prisma.inviteCode.create({
          data: {
            id: randomUUID(),
            code: `${workspace.slug.toUpperCase()}-VIP-2025`,
            workspaceId: workspace.id,
            createdBy: adminUserId!,
            maxUses: 1,
            usedCount: 0,
            expiresAt: thirtyDaysFromNow,
            targetEmail: `vip@${workspace.slug}.com`,
          },
        });
        console.log(
          `✓ Created VIP invite code for ${workspace.name}: ${workspace.slug.toUpperCase()}-VIP-2025 (for vip@${workspace.slug}.com)`,
        );
      }
    }

    // Create manager users with single workspace membership (Task 9)
    console.log("\n👔 Creating manager users...");
    for (const manager of managerUsers) {
      // Get or create Supabase auth user
      const supabaseUser = await getOrCreateSupabaseUser(
        manager.email,
        DEFAULT_PASSWORD,
        { role: "MANAGER", name: manager.name },
      );

      if (supabaseUser) {
        const workspace = createdWorkspaces.find(
          (w) => w.slug === manager.workspace,
        );

        // Split name into firstName and lastName
        const { firstName, lastName } = splitFullName(manager.name);

        // Create Prisma user
        const user = await prisma.user.upsert({
          where: { email: manager.email },
          update: {
            supabaseUserId: supabaseUser.id,
            firstName,
            lastName,
            displayName: manager.name,
            isPending: false,
            tenantId: workspace?.slug || "default",
          },
          create: {
            email: manager.email,
            supabaseUserId: supabaseUser.id,
            firstName,
            lastName,
            displayName: manager.name,
            isPending: false,
            tenantId: workspace?.slug || "default",
          },
        });

        // Create WorkspaceMembership with MANAGER role (actual role)
        if (workspace) {
          await prisma.workspaceMembership.upsert({
            where: {
              userId_workspaceId: {
                userId: user.id,
                workspaceId: workspace.id,
              },
            },
            update: {
              role: "MANAGER" as Role, // MANAGER role in WorkspaceMembership
              isPrimary: true,
            },
            create: {
              userId: user.id,
              workspaceId: workspace.id,
              role: "MANAGER" as Role, // MANAGER role in WorkspaceMembership
              isPrimary: true,
            },
          });
        }

        console.log(
          `✓ Created manager: ${manager.email} (workspace: ${manager.workspace})`,
        );
      } else {
        console.error(
          `❌ Failed to create/retrieve manager user: ${manager.email}`,
        );
      }
    }

    // Create participant users with single workspace membership
    console.log("\n👥 Creating participant users...");
    for (const participant of participantUsers) {
      // Get or create Supabase auth user
      const supabaseUser = await getOrCreateSupabaseUser(
        participant.email,
        DEFAULT_PASSWORD,
        { role: "PARTICIPANT", name: participant.name },
      );

      if (supabaseUser) {
        // Create or update Prisma user linked to respective workspace
        const workspace = createdWorkspaces.find(
          (w) => w.slug === participant.workspace,
        );

        // Split name into firstName and lastName
        const { firstName, lastName } = splitFullName(participant.name);

        // Use upsert to handle existing Prisma users
        const user = await prisma.user.upsert({
          where: { email: participant.email },
          update: {
            supabaseUserId: supabaseUser.id,
            firstName,
            lastName,
            displayName: participant.name,
            isPending: false, // Seeded participants are not pending
            tenantId: workspace?.slug || "default", // Use workspace slug as tenantId
          },
          create: {
            email: participant.email,
            supabaseUserId: supabaseUser.id,
            firstName,
            lastName,
            displayName: participant.name,
            isPending: false, // Seeded participants are not pending
            tenantId: workspace?.slug || "default", // Use workspace slug as tenantId
          },
        });

        // Create WorkspaceMembership for participants too
        if (workspace) {
          await prisma.workspaceMembership.upsert({
            where: {
              userId_workspaceId: {
                userId: user.id,
                workspaceId: workspace.id,
              },
            },
            update: {
              role: 'PARTICIPANT',
              isPrimary: true,
            },
            create: {
              userId: user.id,
              workspaceId: workspace.id,
              role: 'PARTICIPANT',
              isPrimary: true,
            },
          });
        }
        console.log(`✓ Created/updated participant: ${participant.email}`);
      } else {
        console.error(
          `❌ Failed to create/retrieve participant user: ${participant.email}`,
        );
      }
    }

    // Create challenges for each workspace with varied statuses
    console.log("\n🎯 Creating challenges...");
    const allChallenges = [];
    const challengeStatuses = [
      "DRAFT",
      "PUBLISHED",
      "PUBLISHED",
      "PUBLISHED",
      "ARCHIVED",
    ] as const;
    for (const workspace of createdWorkspaces) {
      // Create 4 challenges per workspace (deterministic)
      const numChallenges = 4;
      for (let i = 0; i < numChallenges; i++) {
        const template = challengeTemplates[i % challengeTemplates.length];

        // Generate realistic dates for demo data (deterministic)
        const now = new Date();
        const startDate = new Date(
          now.getTime() +
            (i * 7 + 7) * 24 * 60 * 60 * 1000,
        ); // Start 1-4 weeks from now, staggered weekly
        const endDate = new Date(
          startDate.getTime() +
            (30 + i * 10) * 24 * 60 * 60 * 1000,
        ); // End 30-60 days after start, staggered
        const enrollmentDeadline = new Date(
          startDate.getTime() - 7 * 24 * 60 * 60 * 1000,
        ); // Enrollment deadline 1 week before start

        // Assign varied statuses and reward types
        const status = challengeStatuses[i % challengeStatuses.length];
        const rewardTypes = [
          RewardType.points,
          RewardType.sku,
          RewardType.monetary,
          null,
          null,
        ] as const;
        const rewardType = rewardTypes[i % rewardTypes.length];
        const rewardConfig =
          rewardType === RewardType.sku
            ? { skuId: "SKU-GIFT-10" }
            : rewardType === RewardType.monetary
              ? { amount: 50, currency: "USD" }
              : null;

        const challenge = await prisma.challenge.create({
          data: {
            id: randomUUID(),
            title: `${template.title} - ${workspace.name}`,
            description: template.description,
            startDate,
            endDate,
            enrollmentDeadline,
            workspaceId: workspace.id,
            status: status as any,
            rewardType: rewardType as any,
            rewardConfig: rewardConfig || Prisma.JsonNull,
          },
        });
        allChallenges.push(challenge);
        console.log(`✓ Created challenge: ${challenge.title} (${status})`);

        // Seed timeline: challenge created event
        await prisma.activityEvent.create({
          data: {
            workspaceId: workspace.id,
            challengeId: challenge.id,
            type: ActivityEventType.CHALLENGE_CREATED,
            actorUserId: adminUserId,
          },
        });

        // Add published/archived events if applicable
        if (status === "PUBLISHED") {
          await prisma.activityEvent.create({
            data: {
              workspaceId: workspace.id,
              challengeId: challenge.id,
              type: ActivityEventType.CHALLENGE_PUBLISHED,
              actorUserId: adminUserId,
            },
          });
        } else if (status === "ARCHIVED") {
          await prisma.activityEvent.create({
            data: {
              workspaceId: workspace.id,
              challengeId: challenge.id,
              type: ActivityEventType.CHALLENGE_ARCHIVED,
              actorUserId: adminUserId,
            },
          });
        }
      }
    }

    // Create challenge points budgets for first 2 challenges per workspace
    console.log("\n🎯 Creating challenge points budgets...");
    for (const workspace of createdWorkspaces) {
      const workspaceChallenges = allChallenges.filter(
        (c) => c.workspaceId === workspace.id,
      );
      for (const challenge of workspaceChallenges.slice(0, 2)) {
        await prisma.challengePointsBudget.create({
          data: {
            challengeId: challenge.id,
            workspaceId: workspace.id,
            totalBudget: 2000, // 2,000 points per challenge
            allocated: 0,
            updatedBy: adminUserId,
          },
        });
        console.log(
          `✓ Created points budget for challenge: ${challenge.title}`,
        );
      }
    }

    // Create activity templates for each workspace with diverse reward types
    console.log("\n📋 Creating activity templates and activities...");
    const activityTemplates = [
      {
        name: "Weekly Check-in",
        description: "Share your weekly progress",
        type: "TEXT_SUBMISSION",
        points: 10,
        rewardType: RewardType.points,
        rewardConfig: null,
      },
      {
        name: "Document Upload",
        description: "Upload supporting documents",
        type: "FILE_UPLOAD",
        points: 20,
        rewardType: RewardType.points,
        rewardConfig: null,
      },
      {
        name: "Photo Evidence",
        description: "Share a photo of your work",
        type: "PHOTO_UPLOAD",
        points: 15,
        rewardType: RewardType.points,
        rewardConfig: null,
      },
      {
        name: "Resource Sharing",
        description: "Share helpful links",
        type: "LINK_SUBMISSION",
        points: 5,
        rewardType: RewardType.points,
        rewardConfig: null,
      },
      {
        name: "Video Submission",
        description: "Record a video update",
        type: "VIDEO_SUBMISSION",
        points: 25,
        rewardType: RewardType.points,
        rewardConfig: null,
      },
      {
        name: "Quiz Response",
        description: "Answer multiple choice questions",
        type: "MULTIPLE_CHOICE",
        points: 8,
        rewardType: RewardType.points,
        rewardConfig: null,
      },
      {
        name: "Excellence Award",
        description: "Earn a gift card for outstanding contribution",
        type: "TEXT_SUBMISSION",
        points: 0,
        rewardType: RewardType.sku,
        rewardConfig: { skuId: "SKU-GIFT-25", label: "$25 Gift Card" },
      },
      {
        name: "Bonus Task",
        description: "Complete this task for monetary reward",
        type: "FILE_UPLOAD",
        points: 0,
        rewardType: RewardType.monetary,
        rewardConfig: { amount: 10, currency: "USD" },
      },
    ];

    for (const workspace of createdWorkspaces) {
      for (const template of activityTemplates) {
        const activityTemplate = await prisma.activityTemplate.create({
          data: {
            id: randomUUID(),
            name: template.name,
            description: template.description,
            type: template.type as any,
            basePoints: template.points,
            rewardType: template.rewardType as any,
            rewardConfig: template.rewardConfig || Prisma.JsonNull,
            workspaceId: workspace.id,
            requiresApproval: template.type !== "MULTIPLE_CHOICE",
            allowMultiple: template.type === "TEXT_SUBMISSION",
          },
        });

        // Add activities to ALL published challenges (not just first 2)
        const workspaceChallenges = allChallenges.filter(
          (c) => c.workspaceId === workspace.id && c.status === "PUBLISHED",
        );
        for (const challenge of workspaceChallenges) {
          await prisma.activity.create({
            data: {
              id: randomUUID(),
              templateId: activityTemplate.id,
              challengeId: challenge.id,
              pointsValue: template.points,
              maxSubmissions: template.type === "TEXT_SUBMISSION" ? 5 : 1,
              isRequired: false,
              deadline: new Date(
                challenge.endDate.getTime() - 7 * 24 * 60 * 60 * 1000,
              ), // 1 week before challenge end
            },
          });
        }
      }
      console.log(
        `✓ Created ${activityTemplates.length} activity templates for ${workspace.name}`,
      );
    }

    // Create enrollments (participants in challenges)
    console.log("\n📝 Creating enrollments...");
    const participantMemberships = await prisma.workspaceMembership.findMany({
      where: { role: 'PARTICIPANT' },
      include: { User: true, Workspace: true },
      orderBy: [
        { Workspace: { slug: 'asc' } },
        { User: { email: 'asc' } }
      ],
    });

    for (const membership of participantMemberships) {
      const participant = membership.User;
      // Enroll each participant in 1-3 challenges from their workspace
      const workspaceChallenges = allChallenges.filter(
        (c) => c.workspaceId === membership.workspaceId,
      );

      // Enroll in 1-3 challenges per participant (deterministic based on index)
      const participantIndex = participantMemberships.indexOf(membership);
      const numEnrollments = Math.min(
        (participantIndex % 3) + 1, // 1, 2, or 3 enrollments based on position
        workspaceChallenges.length,
      );

      // Select challenges deterministically (no random sort)
      const selectedChallenges = workspaceChallenges
        .slice(0, numEnrollments);

      for (const challenge of selectedChallenges) {
        // Deterministic status based on participant and challenge indices
        const challengeIndex = selectedChallenges.indexOf(challenge);
        const statusIndex = (participantIndex + challengeIndex) % 3;
        const enrollment = await prisma.enrollment.create({
          data: {
            userId: participant.id,
            challengeId: challenge.id,
            status: [
              EnrollmentStatus.INVITED,
              EnrollmentStatus.ENROLLED,
              EnrollmentStatus.WITHDRAWN,
            ][statusIndex],
          },
        });
        console.log(`✓ Enrolled ${participant.email} in challenge`);

        if (enrollment.status === EnrollmentStatus.ENROLLED) {
          await prisma.activityEvent.create({
            data: {
              workspaceId: challenge.workspaceId,
              challengeId: challenge.id,
              enrollmentId: enrollment.id,
              userId: participant.id,
              type: ActivityEventType.ENROLLED,
            },
          });
        }
      }
    }

    // Create many sample activity submissions with varied timestamps for leaderboard testing
    console.log("\n📝 Creating sample activity submissions with points...");
    let submissionCount = 0;
    const enrolledEnrollments = await prisma.enrollment.findMany({
      where: { status: EnrollmentStatus.ENROLLED },
      include: { Challenge: { include: { Workspace: true } }, User: true },
      orderBy: [
        { Challenge: { Workspace: { slug: 'asc' } } },
        { User: { email: 'asc' } }
      ],
    });

    // Time periods for varied data (for leaderboard filtering testing)
    const now = new Date();
    const timePeriods = [
      { name: 'today', daysAgo: 0 },
      { name: 'this week', daysAgo: 3 },
      { name: 'this week', daysAgo: 5 },
      { name: 'this month', daysAgo: 15 },
      { name: 'this month', daysAgo: 25 },
      { name: 'older', daysAgo: 35 },
      { name: 'older', daysAgo: 50 },
    ];

    for (const enrollment of enrolledEnrollments) {
      // Find multiple activities for this challenge
      const activities = await prisma.activity.findMany({
        where: { challengeId: enrollment.challengeId },
        include: { ActivityTemplate: true },
        take: 5, // Up to 5 activities per enrollment
      });

      // Create 2-4 submissions per enrolled user with varied timestamps
      const numSubmissions = 2 + (submissionCount % 3); // 2, 3, or 4 submissions
      for (let i = 0; i < Math.min(numSubmissions, activities.length); i++) {
        const activity = activities[i];
        if (!activity) continue;

        // Select time period for this submission
        const timePeriod = timePeriods[submissionCount % timePeriods.length];
        const submissionDate = new Date(now.getTime() - (timePeriod.daysAgo * 24 * 60 * 60 * 1000));

        // Create submissions with varied statuses (more approved for leaderboard data)
        const statuses = ["APPROVED", "APPROVED", "APPROVED", "APPROVED", "PENDING", "REJECTED"];
        const status = statuses[submissionCount % statuses.length] as
          | "APPROVED"
          | "PENDING"
          | "REJECTED";

        const submission = await prisma.activitySubmission.create({
          data: {
            id: randomUUID(),
            activityId: activity.id,
            userId: enrollment.userId,
            enrollmentId: enrollment.id,
            textContent: `Sample submission content for testing (${status}, ${timePeriod.name})`,
            status: status,
            pointsAwarded: status === "APPROVED" ? activity.pointsValue : null,
            reviewedBy: status !== "PENDING" ? adminUserId : null,
            reviewedAt: status !== "PENDING" ? submissionDate : null,
            reviewNotes:
              status === "APPROVED"
                ? "Approved for testing"
                : status === "REJECTED"
                  ? "Does not meet requirements"
                  : null,
            submittedAt: submissionDate,
          },
        });

        // Award points through the budget system for approved submissions
        if (status === "APPROVED") {
          try {
            await awardPointsWithBudget({
              workspaceId: enrollment.Challenge.workspaceId,
              challengeId: enrollment.challengeId,
              toUserId: enrollment.userId,
              amount: activity.pointsValue,
              actorUserId: adminUserId,
              submissionId: submission.id,
            });

            // Create submission approved event with historical timestamp
            await prisma.activityEvent.create({
              data: {
                workspaceId: enrollment.Challenge.workspaceId,
                challengeId: enrollment.challengeId,
                enrollmentId: enrollment.id,
                userId: enrollment.userId,
                actorUserId: adminUserId,
                type: ActivityEventType.SUBMISSION_APPROVED,
                metadata: {
                  submissionId: submission.id,
                  points: activity.pointsValue,
                },
                createdAt: submissionDate,
              },
            });
          } catch (error) {
            console.warn(`⚠️ Could not award points: ${error}`);
          }
        } else if (status === "REJECTED") {
          // Create submission rejected event
          await prisma.activityEvent.create({
            data: {
              workspaceId: enrollment.Challenge.workspaceId,
              challengeId: enrollment.challengeId,
              enrollmentId: enrollment.id,
              userId: enrollment.userId,
              actorUserId: adminUserId,
              type: ActivityEventType.SUBMISSION_REJECTED,
              metadata: { submissionId: submission.id },
              createdAt: submissionDate,
            },
          });
        } else {
          // Create submission created event for pending
          await prisma.activityEvent.create({
            data: {
              workspaceId: enrollment.Challenge.workspaceId,
              challengeId: enrollment.challengeId,
              enrollmentId: enrollment.id,
              userId: enrollment.userId,
              type: ActivityEventType.SUBMISSION_CREATED,
              metadata: { submissionId: submission.id },
              createdAt: submissionDate,
            },
          });
        }
        submissionCount++;
      }
    }
    console.log(
      `✓ Created ${submissionCount} activity submissions across different time periods (approved, pending, rejected)`,
    );

    // Award some initial points to participants (not tied to submissions)
    console.log("\n🏆 Awarding initial points to participants...");
    for (const membership of participantMemberships) {
      const participant = membership.User;
      if (membership.workspaceId) {
        // Deterministic points based on participant index (10, 25, 50, 75, 10, 25...)
        const participantIndex = participantMemberships.indexOf(membership);
        const pointsPattern = [10, 25, 50, 75];
        const pointsToAward = pointsPattern[participantIndex % 4];
        if (pointsToAward > 0) {
          try {
            await awardPointsWithBudget({
              workspaceId: membership.workspaceId,
              challengeId: null, // General award, not challenge-specific
              toUserId: participant.id,
              amount: pointsToAward,
              actorUserId: adminUserId,
              submissionId: null,
            });
            console.log(
              `✓ Awarded ${pointsToAward} initial points to participant`,
            );
          } catch (error) {
            console.warn(`⚠️ Could not award initial points: ${error}`);
          }
        }
      }
    }
    console.log(`✓ Completed initial points awards for participants`);

    // Print summary
    console.log("\n✨ Seed completed successfully!\n");
    console.log("📊 Summary:");
    const finalWorkspaceCount = await prisma.workspace.count();
    const finalUserCount = await prisma.user.count();
    const finalChallengeCount = await prisma.challenge.count();
    const finalEnrollmentCount = await prisma.enrollment.count();
    const finalMembershipCount = await prisma.workspaceMembership.count();
    const finalInviteCount = await prisma.inviteCode.count();
    const finalInviteRedemptionCount = await prisma.inviteRedemption.count();
    const finalActivityTemplateCount = await prisma.activityTemplate.count();
    const finalActivityCount = await prisma.activity.count();
    const finalSubmissionCount = await prisma.activitySubmission.count();
    const finalEmailSettingsCount = await prisma.workspaceEmailSettings.count();
    const finalEmailTemplateCount = await prisma.workspaceEmailTemplate.count();
    const finalSegmentCount = await prisma.workspaceParticipantSegment.count();
    const finalPointsBalanceCount = await prisma.pointsBalance.count();
    const finalWorkspaceBudgetCount =
      await prisma.workspacePointsBudget.count();
    const finalChallengeBudgetCount =
      await prisma.challengePointsBudget.count();
    const finalPointsLedgerCount = await prisma.pointsLedger.count();
    const finalCommunicationCount = await prisma.workspaceCommunication.count();
    const finalActivityEventCount = await prisma.activityEvent.count();
    const finalRewardIssuanceCount = await prisma.rewardIssuance.count();
    const finalTenantSkuCount = await (prisma as any).tenantSku.count();

    console.log(`  - Workspaces: ${finalWorkspaceCount}`);
    console.log(
      `  - Users: ${finalUserCount} (${adminUsers.length} admins, ${participantUsers.length} participants)`,
    );
    console.log(`  - Workspace Memberships: ${finalMembershipCount}`);
    console.log(`  - Challenges: ${finalChallengeCount}`);
    console.log(`  - Enrollments: ${finalEnrollmentCount}`);
    console.log(`  - Activity Templates: ${finalActivityTemplateCount}`);
    console.log(`  - Activities: ${finalActivityCount}`);
    console.log(`  - Activity Submissions: ${finalSubmissionCount}`);
    console.log(`  - Invite Codes: ${finalInviteCount}`);
    console.log(`  - Invite Redemptions: ${finalInviteRedemptionCount}`);
    console.log(`  - Email Settings: ${finalEmailSettingsCount}`);
    console.log(`  - Email Templates: ${finalEmailTemplateCount}`);
    console.log(`  - Participant Segments: ${finalSegmentCount}`);
    console.log(`  - Points Balances: ${finalPointsBalanceCount}`);
    console.log(`  - Workspace Budgets: ${finalWorkspaceBudgetCount}`);
    console.log(`  - Challenge Budgets: ${finalChallengeBudgetCount}`);
    console.log(`  - Points Ledger Entries: ${finalPointsLedgerCount}`);
    console.log(`  - Workspace Communications: ${finalCommunicationCount}`);
    console.log(`  - Activity Events: ${finalActivityEventCount}`);
    console.log(`  - Reward Issuances: ${finalRewardIssuanceCount}`);
    console.log(`  - Tenant SKUs: ${finalTenantSkuCount}`);

    // Seed tenant SKU catalog (exemplar; safe to hardcode per tenant)
    console.log("\n🛍️  Seeding tenant SKU catalog...");
    const uniqueTenantIds = Array.from(
      new Set(createdWorkspaces.map((w) => (w as any).tenantId || "default")),
    );
    for (const tenantId of uniqueTenantIds) {
      const skus = [
        { skuId: "SKU-GIFT-10", label: "$10 Gift Card", provider: "stub" },
        { skuId: "SKU-GIFT-25", label: "$25 Gift Card", provider: "stub" },
        { skuId: "SKU-SWAG-TEE", label: "Company Tee", provider: "stub" },
      ];
      for (const sku of skus) {
        await (prisma as any).tenantSku.upsert({
          where: { tenantId_skuId: { tenantId, skuId: sku.skuId } },
          update: { label: sku.label, provider: sku.provider },
          create: {
            id: randomUUID(),
            tenantId,
            skuId: sku.skuId,
            label: sku.label,
            provider: sku.provider,
          },
        });
      }
      console.log(`✓ Seeded ${skus.length} SKUs for tenant '${tenantId}'`);
    }

    // Seed sample reward issuances for demo
    console.log("\n🎁 Seeding sample reward issuances...");
    for (const workspace of createdWorkspaces) {
      const anyParticipantMembership = await prisma.workspaceMembership.findFirst({
        where: { role: 'PARTICIPANT', workspaceId: workspace.id },
        include: { User: true },
      });
      const anyParticipant = anyParticipantMembership?.User;
      if (anyParticipant) {
        await prisma.rewardIssuance.createMany({
          data: [
            {
              id: randomUUID(),
              userId: anyParticipant.id,
              workspaceId: workspace.id,
              type: RewardType.points,
              amount: 15,
              status: "ISSUED",
              issuedAt: new Date(),
            },
            {
              id: randomUUID(),
              userId: anyParticipant.id,
              workspaceId: workspace.id,
              type: RewardType.sku,
              skuId: "SKU-GIFT-10",
              status: "ISSUED",
              issuedAt: new Date(),
            },
            {
              id: randomUUID(),
              userId: anyParticipant.id,
              workspaceId: workspace.id,
              type: RewardType.monetary,
              amount: 5,
              currency: "USD",
              status: "PENDING",
            },
          ],
        });
        console.log(`✓ RewardIssuance samples created for ${workspace.name}`);
      }
    }

    // Create workspace communications with various scopes
    console.log("\n💬 Creating workspace communications...");
    let communicationCount = 0;
    for (const workspace of createdWorkspaces) {
      // Workspace-level communication
      await prisma.workspaceCommunication.create({
        data: {
          workspaceId: workspace.id,
          scope: "WORKSPACE",
          audience: "ALL",
          subject: `Welcome to ${workspace.name}!`,
          message:
            "We are excited to have you join our innovation community. Get ready to make an impact!",
          sentBy: adminUserId!,
        },
      });
      communicationCount++;

      // Challenge-level communications
      const workspaceChallenges = allChallenges.filter(
        (c) => c.workspaceId === workspace.id && c.status === "PUBLISHED",
      );
      for (const challenge of workspaceChallenges.slice(0, 2)) {
        // Communication to all enrolled participants
        await prisma.workspaceCommunication.create({
          data: {
            workspaceId: workspace.id,
            challengeId: challenge.id,
            scope: "CHALLENGE",
            audience: "ENROLLED",
            subject: `${challenge.title} - Important Update`,
            message:
              "Thank you for enrolling! Here are some tips to get started with this challenge...",
            sentBy: adminUserId!,
          },
        });
        communicationCount++;

        // Communication to invited participants
        await prisma.workspaceCommunication.create({
          data: {
            workspaceId: workspace.id,
            challengeId: challenge.id,
            scope: "CHALLENGE",
            audience: "INVITED",
            subject: `You're invited to ${challenge.title}`,
            message:
              "Join us for this exciting challenge! Click here to enroll and start making a difference.",
            sentBy: adminUserId!,
          },
        });
        communicationCount++;

        // Activity-level communication (if activities exist)
        const challengeActivity = await prisma.activity.findFirst({
          where: { challengeId: challenge.id },
        });
        if (challengeActivity) {
          await prisma.workspaceCommunication.create({
            data: {
              workspaceId: workspace.id,
              challengeId: challenge.id,
              activityId: challengeActivity.id,
              scope: "ACTIVITY",
              audience: "ENROLLED",
              subject: "Activity Reminder",
              message:
                "Don't forget to complete your activity submission before the deadline!",
              sentBy: adminUserId!,
            },
          });
          communicationCount++;
        }
      }
    }
    console.log(
      `✓ Created ${communicationCount} workspace communications (workspace, challenge, and activity scoped)`,
    );

    // Create invite redemptions for participants
    console.log("\n🎟️ Creating invite redemptions...");
    let redemptionCount = 0;
    for (const workspace of createdWorkspaces) {
      // Get participants in this workspace
      const workspaceMemberships = participantMemberships.filter(
        (m) => m.workspaceId === workspace.id,
      );

      // Get invite codes for this workspace
      const workspaceInvites = await prisma.inviteCode.findMany({
        where: { workspaceId: workspace.id },
      });

      // Create redemptions for first 2 participants using the general invite
      const generalInvite = workspaceInvites.find((i) => !i.targetEmail);
      if (generalInvite) {
        for (const membership of workspaceMemberships.slice(0, 2)) {
          await prisma.inviteRedemption.create({
            data: {
              id: randomUUID(),
              inviteId: generalInvite.id,
              userId: membership.User.id,
            },
          });
          redemptionCount++;

          // Update invite code used count
          await prisma.inviteCode.update({
            where: { id: generalInvite.id },
            data: { usedCount: { increment: 1 } },
          });

          // Create activity event for invite redemption
          await prisma.activityEvent.create({
            data: {
              workspaceId: workspace.id,
              userId: membership.User.id,
              actorUserId: membership.User.id,
              type: ActivityEventType.INVITE_REDEEMED,
              metadata: { inviteCode: generalInvite.code },
            },
          });
        }
      }
    }
    console.log(`✓ Created ${redemptionCount} invite redemptions`);

    // Show budget utilization
    console.log("\n💵 Budget Utilization:");
    for (const workspace of createdWorkspaces) {
      const budget = await prisma.workspacePointsBudget.findUnique({
        where: { workspaceId: workspace.id },
      });
      if (budget) {
        const remaining = budget.totalBudget - budget.allocated;
        const percentUsed =
          budget.totalBudget > 0
            ? Math.round((budget.allocated / budget.totalBudget) * 100)
            : 0;
        console.log(
          `  ${workspace.name}: ${budget.allocated}/${budget.totalBudget} points used (${percentUsed}%), ${remaining} remaining`,
        );
      }
    }

    console.log("\n🔑 Login Credentials:");
    console.log(`  Password for all users: ${DEFAULT_PASSWORD}`);
    console.log("\n  Multi-workspace admin accounts:");
    console.log(`    - krobinson@alldigitalrewards.com (3 workspaces)`);
    console.log(`    - jfelke@alldigitalrewards.com (2 workspaces)`);
    console.log(`    - jhoughtelin@alldigitalrewards.com (2 workspaces)`);
    console.log("\n  Single-workspace admin:");
    console.log(`    - kfelke@alldigitalrewards.com (AllDigitalRewards only)`);
    console.log("\n  Manager accounts:");
    console.log(`    - sarah.manager@acme.com (ACME)`);
    console.log(`    - tom.manager@alldigitalrewards.com (AllDigitalRewards)`);
    console.log(`    - lisa.manager@sharecare.com (Sharecare)`);
    console.log("\n  Sample participant accounts:");
    console.log(`    - john.doe@acme.com (ACME)`);
    console.log(`    - sarah.jones@alldigitalrewards.com (AllDigitalRewards)`);
    console.log(`    - david.brown@sharecare.com (Sharecare)`);
    console.log("\n📨 Sample Invite Codes:");
    console.log(`    - ACME-WELCOME-2025 (general invite for ACME)`);
    console.log(
      `    - ALLDIGITALREWARDS-WELCOME-2025 (general invite for AllDigitalRewards)`,
    );
    console.log(`    - SHARECARE-WELCOME-2025 (general invite for Sharecare)`);
    console.log(
      `    - *-VIP-2025 codes are email-targeted (e.g., vip@acme.com)`,
    );
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seed().catch((error) => {
  console.error("Fatal error during seeding:", error);
  process.exit(1);
});
