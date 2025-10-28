/**
 * Staging Database Seed Script
 * Ensures minimum required data exists for staging environment
 * Safe to run multiple times - checks for existing data
 */

import {
  PrismaClient,
  EnrollmentStatus,
} from "@prisma/client";
import { ROLE_ADMIN, ROLE_PARTICIPANT } from "../lib/types";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// Essential workspaces for staging
const stagingWorkspaces = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "demo",
    name: "Demo Workspace",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "alldigitalrewards",
    name: "AllDigitalRewards",
  },
];

// Essential admin users for staging
const stagingAdmins = [
  {
    email: "admin@changemaker.im",
    name: "Staging Admin",
    workspace: "demo",
  },
  {
    email: "jfelke@alldigitalrewards.com",
    name: "Jack Felke",
    workspace: "alldigitalrewards",
  },
];

/**
 * Get or create a Supabase user for staging
 */
async function ensureSupabaseUser(email: string, name: string) {
  try {
    // Check if user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log(`✓ Supabase user exists: ${email}`);
      return existingUser.id;
    }

    // Create new user with a secure password
    const password = `Staging_${Math.random().toString(36).slice(-8)}!`;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (error) {
      console.error(`Failed to create Supabase user ${email}:`, error);
      return null;
    }

    console.log(`✓ Created Supabase user: ${email}`);
    return data.user.id;
  } catch (error) {
    console.error(`Error ensuring Supabase user ${email}:`, error);
    return null;
  }
}

async function seedStaging() {
  try {
    console.log("🌱 Starting staging seed...\n");

    // 1. Ensure workspaces exist
    console.log("📁 Ensuring workspaces...");
    for (const workspace of stagingWorkspaces) {
      const existing = await prisma.workspace.findUnique({
        where: { slug: workspace.slug },
      });

      if (!existing) {
        await prisma.workspace.create({
          data: workspace,
        });
        console.log(`✓ Created workspace: ${workspace.name}`);
      } else {
        console.log(`✓ Workspace exists: ${workspace.name}`);
      }
    }

    // 2. Ensure admin users exist
    console.log("\n👤 Ensuring admin users...");
    for (const admin of stagingAdmins) {
      const workspace = await prisma.workspace.findUnique({
        where: { slug: admin.workspace },
      });

      if (!workspace) {
        console.error(`Workspace not found: ${admin.workspace}`);
        continue;
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: admin.email },
      });

      if (!existingUser) {
        // Create Supabase user
        const supabaseUserId = await ensureSupabaseUser(admin.email, admin.name);

        if (supabaseUserId) {
          // Create database user
          await prisma.user.create({
            data: {
              email: admin.email,
              supabaseUserId,
              role: ROLE_ADMIN,
              WorkspaceMembership: {
                create: {
                  workspaceId: workspace.id,
                  role: ROLE_ADMIN,
                  isPrimary: true,
                },
              },
            },
          });
          console.log(`✓ Created admin: ${admin.name} (${admin.email})`);
        }
      } else {
        console.log(`✓ Admin exists: ${admin.name} (${admin.email})`);

        // Ensure workspace membership exists
        const membership = await prisma.workspaceMembership.findFirst({
          where: {
            userId: existingUser.id,
            workspaceId: workspace.id,
          },
        });

        if (!membership) {
          await prisma.workspaceMembership.create({
            data: {
              userId: existingUser.id,
              workspaceId: workspace.id,
              role: ROLE_ADMIN,
              isPrimary: false,
            },
          });
          console.log(`  → Added to workspace: ${workspace.name}`);
        }
      }
    }

    // 3. Create sample challenges for demo workspace
    console.log("\n🎯 Ensuring demo challenges...");
    const demoWorkspace = await prisma.workspace.findUnique({
      where: { slug: "demo" },
      include: { Challenge: true },
    });

    if (demoWorkspace && demoWorkspace.Challenge.length === 0) {
      const challenges = [
        {
          id: crypto.randomUUID(),
          title: "Welcome Challenge",
          description: "Get started with the Changemaker platform",
          workspaceId: demoWorkspace.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: "PUBLISHED" as const,
        },
        {
          id: crypto.randomUUID(),
          title: "Innovation Sprint",
          description: "Share your innovative ideas",
          workspaceId: demoWorkspace.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          status: "PUBLISHED" as const,
        },
      ];

      for (const challenge of challenges) {
        await prisma.challenge.create({ data: challenge });
        console.log(`✓ Created challenge: ${challenge.title}`);
      }
    } else {
      console.log(`✓ Demo workspace has ${demoWorkspace?.Challenge.length || 0} challenges`);
    }

    console.log("\n✅ Staging seed completed successfully!");
  } catch (error) {
    console.error("Error during staging seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedStaging().catch((error) => {
  console.error("Fatal error during staging seed:", error);
  process.exit(1);
});