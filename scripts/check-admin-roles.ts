import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Use DIRECT_URL to bypass PgBouncer
if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

async function checkAdminRoles() {
  console.log("🔍 Checking admin user roles in staging database...\n");

  const adminEmails = [
    "krobinson@alldigitalrewards.com",
    "kfelke@alldigitalrewards.com",
    "jfelke@alldigitalrewards.com",
    "jhoughtelin@alldigitalrewards.com",
    "admin.adr@test.com",
    "admin.acme@test.com",
    "admin.sharecare@test.com",
  ];

  for (const email of adminEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        WorkspaceMembership: {
          include: {
            Workspace: {
              select: { name: true, slug: true }
            }
          }
        }
      }
    });

    if (!user) {
      console.log(`❌ ${email}: NOT FOUND`);
      continue;
    }

    console.log(`\n👤 ${email}`);
    if (user.WorkspaceMembership.length === 0) {
      console.log(`   ⚠️  NO WORKSPACE MEMBERSHIPS`);
    } else {
      for (const membership of user.WorkspaceMembership) {
        const primaryFlag = membership.isPrimary ? " (PRIMARY)" : "";
        console.log(`   ✓ ${membership.Workspace.name} (${membership.Workspace.slug}): ${membership.role}${primaryFlag}`);
      }
    }
  }

  console.log("\n\n🔍 Checking manager and participant roles...\n");

  const managerEmails = [
    "manager1@test.com",
    "manager2@test.com",
    "manager.acme@test.com",
    "manager.sharecare@test.com",
  ];

  for (const email of managerEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        WorkspaceMembership: {
          include: {
            Workspace: {
              select: { name: true, slug: true }
            }
          }
        }
      }
    });

    if (!user) {
      console.log(`❌ ${email}: NOT FOUND`);
      continue;
    }

    console.log(`\n👔 ${email}`);
    if (user.WorkspaceMembership.length === 0) {
      console.log(`   ⚠️  NO WORKSPACE MEMBERSHIPS`);
    } else {
      for (const membership of user.WorkspaceMembership) {
        const primaryFlag = membership.isPrimary ? " (PRIMARY)" : "";
        console.log(`   ✓ ${membership.Workspace.name} (${membership.Workspace.slug}): ${membership.role}${primaryFlag}`);
      }
    }
  }

  await prisma.$disconnect();
}

checkAdminRoles().catch(console.error);
