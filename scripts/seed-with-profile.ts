#!/usr/bin/env ts-node
/**
 * Seed Script with Profile Support
 *
 * Usage:
 *   pnpm seed --profile minimal   # Fast iteration (default)
 *   pnpm seed --profile demo      # Full demo like staging
 *   pnpm seed --profile full      # Production-like volume
 *   pnpm seed                     # Defaults to demo
 */

import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

import { runSeedProfile, type SeedProfile } from "../lib/test-support/seeds/profiles";
import { prisma } from "../lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const profileArg = args.find((arg) => arg.startsWith("--profile="));
  const profile: SeedProfile = profileArg
    ? (profileArg.split("=")[1] as SeedProfile)
    : "demo"; // Default to demo

  console.log(`\n🌱 Starting seed with profile: ${profile}\n`);

  try {
    const result = await runSeedProfile(profile, { prisma });

    // Print summary
    console.log("\n✨ Seed completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`  - Workspaces: ${result.stats.workspaceCount}`);
    console.log(`  - Users: ${result.stats.userCount}`);
    console.log(`  - Workspace Memberships: ${result.stats.membershipCount}`);
    console.log(`  - Challenges: ${result.stats.challengeCount}`);

    console.log("\n🔑 Login Credentials:");
    console.log(`  Password for all users: Changemaker2025!`);

    if (profile === "minimal") {
      console.log("\n  Test accounts:");
      console.log(`    - admin@test.com (ADMIN)`);
      console.log(`    - manager@test.com (MANAGER)`);
      console.log(`    - participant@test.com (PARTICIPANT)`);
    } else if (profile === "demo") {
      console.log("\n  Platform admin accounts:");
      console.log(`    - krobinson@alldigitalrewards.com (super admin)`);
      console.log(`    - jfelke@alldigitalrewards.com (super admin)`);
      console.log(`    - kfelke@alldigitalrewards.com`);
      console.log(`    - jhoughtelin@alldigitalrewards.com`);
      console.log("\n  Sample workspace accounts:");
      console.log(`    - manager@alldigitalrewards.com (MANAGER)`);
      console.log(`    - participant1@alldigitalrewards.com (PARTICIPANT)`);
      console.log(`    - manager@acme.com (MANAGER)`);
      console.log(`    - participant1@acme.com (PARTICIPANT)`);
    }
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
