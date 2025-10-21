#!/usr/bin/env tsx
/**
 * Production Database Seed Script
 *
 * This script adds multiple workspace memberships to existing users
 * in the production database without clearing any existing data.
 *
 * Usage: tsx scripts/seed-production.ts
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load production environment variables
dotenv.config({ path: ".env.production" });
// Ensure Prisma has a DATABASE_URL; fall back to DIRECT_URL if necessary
if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

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

async function seedProduction() {
  try {
    console.log(
      "🌱 Starting production seed for multi-workspace memberships...\n",
    );

    // Get existing workspaces
    const workspaces = await prisma.workspace.findMany({
      orderBy: { name: "asc" },
    });

    console.log(`Found ${workspaces.length} workspaces:`);
    workspaces.forEach((w) => console.log(`  - ${w.name} (${w.slug})`));

    // Define users who should have multiple workspaces
    const multiWorkspaceUsers = [
      {
        email: "krobinson@alldigitalrewards.com",
        workspaces: ["alldigitalrewards", "acme", "sharecare"],
        primaryWorkspace: "alldigitalrewards",
      },
      {
        email: "jfelke@alldigitalrewards.com",
        workspaces: ["alldigitalrewards", "acme"],
        primaryWorkspace: "alldigitalrewards",
      },
      {
        email: "jhoughtelin@alldigitalrewards.com",
        workspaces: ["alldigitalrewards", "sharecare"],
        primaryWorkspace: "alldigitalrewards",
      },
    ];

    console.log("\n👤 Adding multi-workspace memberships...");

    for (const config of multiWorkspaceUsers) {
      // First check if user exists in Supabase auth
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u) => u.email === config.email);

      if (!authUser) {
        console.log(
          `  ⚠️  Skipping ${config.email} - no Supabase auth user found`,
        );
        continue;
      }

      // Find or create Prisma user
      let user = await prisma.user.findUnique({
        where: { email: config.email },
      });

      if (!user) {
        // Create user if doesn't exist
        const primaryWorkspaceId = workspaces.find(
          (w) => w.slug === config.primaryWorkspace,
        )?.id;
        user = await prisma.user.create({
          data: {
            email: config.email,
            supabaseUserId: authUser.id,
            role: "ADMIN",
            workspaceId: primaryWorkspaceId,
          },
        });
        console.log(`  ✓ Created user: ${config.email}`);
      }

      // Add workspace memberships
      for (const workspaceSlug of config.workspaces) {
        const workspace = workspaces.find((w) => w.slug === workspaceSlug);
        if (!workspace) {
          console.log(`  ⚠️  Workspace ${workspaceSlug} not found`);
          continue;
        }

        try {
          await prisma.workspaceMembership.upsert({
            where: {
              userId_workspaceId: {
                userId: user.id,
                workspaceId: workspace.id,
              },
            },
            update: {
              role: "ADMIN",
              isPrimary: workspaceSlug === config.primaryWorkspace,
            },
            create: {
              userId: user.id,
              workspaceId: workspace.id,
              role: "ADMIN",
              isPrimary: workspaceSlug === config.primaryWorkspace,
            },
          });
          console.log(
            `  ✓ Added ${config.email} to ${workspace.name}${workspaceSlug === config.primaryWorkspace ? " (primary)" : ""}`,
          );
        } catch (error) {
          console.error(
            `  ❌ Error adding membership for ${config.email} to ${workspace.name}:`,
            error,
          );
        }
      }
    }

    // Verify the memberships were created
    console.log("\n📊 Verification:");
    for (const config of multiWorkspaceUsers) {
      const user = await prisma.user.findUnique({
        where: { email: config.email },
        include: {
          WorkspaceMembership: {
            include: { Workspace: true },
          },
        },
      });

      if (user) {
        console.log(`  ${user.email}: ${user.WorkspaceMembership.length} workspace(s)`);
        user.WorkspaceMembership.forEach((m: any) => {
          console.log(
            `    - ${m.Workspace.name}${m.isPrimary ? " (primary)" : ""}`,
          );
        });
      }
    }

    console.log("\n✨ Production seed completed successfully!");
    console.log("\n🔑 Test accounts with multiple workspaces:");
    console.log("  - krobinson@alldigitalrewards.com (3 workspaces)");
    console.log("  - jfelke@alldigitalrewards.com (2 workspaces)");
    console.log("  - jhoughtelin@alldigitalrewards.com (2 workspaces)");
    console.log(
      "\nThe workspace switcher should now appear for these users at preview.changemaker.im",
    );
  } catch (error) {
    console.error("❌ Production seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedProduction().catch((error) => {
  console.error("Fatal error during production seeding:", error);
  process.exit(1);
});
