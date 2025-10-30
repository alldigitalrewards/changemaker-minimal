#!/usr/bin/env tsx
/**
 * Reset Staging Database
 * WARNING: This will DELETE ALL DATA in the staging database
 *
 * Usage:
 *   pnpm reset:staging           # Interactive confirmation
 *   pnpm reset:staging --force   # Skip confirmation
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as readline from "readline";

// Load environment variables
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.STAGING_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const FORCE_FLAG = process.argv.includes("--force");

async function confirmReset(): Promise<boolean> {
  if (FORCE_FLAG) {
    console.log("⚠️  Force flag detected - skipping confirmation");
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "\n⚠️  WARNING: This will DELETE ALL DATA in the staging database!\n" +
      "Type 'RESET STAGING' to confirm: ",
      (answer) => {
        rl.close();
        resolve(answer.trim() === "RESET STAGING");
      }
    );
  });
}

async function deleteAllData() {
  console.log("\n🗑️  Deleting all data...");

  // Delete in correct order (respect foreign keys)
  const tables = [
    "ChallengeAssignment",
    "Communication",
    "Reward",
    "Submission",
    "Enrollment",
    "Challenge",
    "WorkspaceMembership",
    "User",
    "Workspace",
  ];

  for (const table of tables) {
    try {
      const result = await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}"`
      );
      console.log(`  ✓ Deleted ${result} rows from ${table}`);
    } catch (error: any) {
      console.error(`  ✗ Failed to delete from ${table}:`, error.message);
    }
  }
}

async function deleteSupabaseUsers() {
  console.log("\n👥 Deleting Supabase auth users...");

  try {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();

    if (!users?.users?.length) {
      console.log("  ℹ️  No Supabase users to delete");
      return;
    }

    let deleted = 0;
    for (const user of users.users) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        deleted++;
      } catch (error: any) {
        console.error(`  ✗ Failed to delete user ${user.email}:`, error.message);
      }
    }

    console.log(`  ✓ Deleted ${deleted}/${users.users.length} Supabase users`);
  } catch (error: any) {
    console.error("  ✗ Failed to list Supabase users:", error.message);
  }
}

async function runMigrations() {
  console.log("\n🔄 Running migrations...");

  const { execSync } = await import("child_process");

  try {
    execSync("pnpm prisma migrate deploy", {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: process.env.STAGING_DATABASE_URL,
        DIRECT_URL: process.env.STAGING_DIRECT_URL,
      },
    });
    console.log("  ✓ Migrations applied");
  } catch (error) {
    console.error("  ✗ Failed to apply migrations");
    throw error;
  }
}

async function runSeed() {
  console.log("\n🌱 Seeding database...");

  const { execSync } = await import("child_process");

  try {
    execSync("npx tsx prisma/seed-staging.ts", {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: process.env.STAGING_DATABASE_URL,
        DIRECT_URL: process.env.STAGING_DIRECT_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.STAGING_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.STAGING_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    console.log("  ✓ Database seeded");
  } catch (error) {
    console.error("  ✗ Failed to seed database");
    throw error;
  }
}

async function main() {
  try {
    console.log("🔧 Staging Database Reset Tool");
    console.log("================================");
    console.log(`Database: ${process.env.STAGING_DATABASE_URL?.split("@")[1]?.split("/")[0] || "Unknown"}`);

    const confirmed = await confirmReset();

    if (!confirmed) {
      console.log("\n❌ Reset cancelled");
      process.exit(0);
    }

    console.log("\n🚀 Starting reset process...");

    // Step 1: Delete all data
    await deleteAllData();

    // Step 2: Delete Supabase users
    await deleteSupabaseUsers();

    // Step 3: Run migrations
    await runMigrations();

    // Step 4: Seed database
    await runSeed();

    console.log("\n✅ Staging database reset complete!");
    console.log("\nNext steps:");
    console.log("  1. Verify staging.changemaker.im is accessible");
    console.log("  2. Test login with admin@changemaker.im");
    console.log("  3. Check manager role functionality");

  } catch (error) {
    console.error("\n❌ Reset failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
