#!/usr/bin/env tsx
/**
 * Verification Script: Seed Determinism
 *
 * Tests that running the seed script multiple times produces identical results
 */

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DatabaseSnapshot {
  workspaces: number;
  users: number;
  challenges: number;
  enrollments: number;
  memberships: number;
  challengeTitles: string[];
  userEmails: string[];
  pointsBalances: { available: number; total: number; userEmail: string; workspaceSlug: string }[];
}

async function captureSnapshot(): Promise<DatabaseSnapshot> {
  const workspaces = await prisma.workspace.count();
  const users = await prisma.user.count();
  const challenges = await prisma.challenge.count();
  const enrollments = await prisma.enrollment.count();
  const memberships = await prisma.workspaceMembership.count();

  const challengeRecords = await prisma.challenge.findMany({
    orderBy: { title: 'asc' },
    select: { title: true }
  });
  const challengeTitles = challengeRecords.map(c => c.title);

  const userRecords = await prisma.user.findMany({
    orderBy: { email: 'asc' },
    select: { email: true }
  });
  const userEmails = userRecords.map(u => u.email);

  // Get balances with user/workspace context for deterministic comparison
  const balances = await prisma.pointsBalance.findMany({
    include: {
      User: { select: { email: true } },
      Workspace: { select: { slug: true } }
    },
    orderBy: [
      { Workspace: { slug: 'asc' } },
      { User: { email: 'asc' } }
    ]
  });
  const pointsBalances = balances.map(b => ({
    available: b.availablePoints,
    total: b.totalPoints,
    userEmail: b.User.email,
    workspaceSlug: b.Workspace.slug
  }));

  return {
    workspaces,
    users,
    challenges,
    enrollments,
    memberships,
    challengeTitles,
    userEmails,
    pointsBalances
  };
}

function hashSnapshot(snapshot: DatabaseSnapshot): string {
  const json = JSON.stringify(snapshot, null, 2);
  return createHash('sha256').update(json).digest('hex');
}

async function resetDatabase() {
  console.log('🗑️  Resetting database...');

  // Delete in correct order to respect foreign keys
  await prisma.activityEvent.deleteMany();
  await prisma.activitySubmission.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.challengeAssignment.deleteMany();
  await prisma.pointsLedger.deleteMany();
  await prisma.pointsBalance.deleteMany();
  await prisma.challengePointsBudget.deleteMany();
  await prisma.workspacePointsBudget.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.activityTemplate.deleteMany();
  await prisma.inviteRedemption.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.workspaceEmailTemplate.deleteMany();
  await prisma.workspaceEmailSettings.deleteMany();
  await prisma.workspaceParticipantSegment.deleteMany();
  await prisma.workspaceMembership.deleteMany();
  await prisma.workspaceCommunication.deleteMany();
  await prisma.rewardIssuance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  console.log('✓ Database reset complete\n');
}

async function runSeed() {
  console.log('🌱 Running seed script...');
  execSync('pnpm tsx prisma/seed.ts', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  console.log('✓ Seed complete\n');
}

async function main() {
  console.log('🔍 Determinism Verification Test\n');
  console.log('Testing that seed script produces identical results across runs...\n');

  try {
    // Run 1
    console.log('=== Run 1 ===');
    await resetDatabase();
    await runSeed();
    const snapshot1 = await captureSnapshot();
    const hash1 = hashSnapshot(snapshot1);
    console.log(`Snapshot 1 hash: ${hash1}`);
    console.log(`  - Workspaces: ${snapshot1.workspaces}`);
    console.log(`  - Users: ${snapshot1.users}`);
    console.log(`  - Challenges: ${snapshot1.challenges}`);
    console.log(`  - Enrollments: ${snapshot1.enrollments}\n`);

    // Run 2
    console.log('=== Run 2 ===');
    await resetDatabase();
    await runSeed();
    const snapshot2 = await captureSnapshot();
    const hash2 = hashSnapshot(snapshot2);
    console.log(`Snapshot 2 hash: ${hash2}`);
    console.log(`  - Workspaces: ${snapshot2.workspaces}`);
    console.log(`  - Users: ${snapshot2.users}`);
    console.log(`  - Challenges: ${snapshot2.challenges}`);
    console.log(`  - Enrollments: ${snapshot2.enrollments}\n`);

    // Compare
    console.log('=== Comparison ===');
    if (hash1 === hash2) {
      console.log('✅ PASS: Seed is deterministic!');
      console.log('   Both runs produced identical database state.');
      process.exit(0);
    } else {
      console.log('❌ FAIL: Seed is non-deterministic!');
      console.log('   Different results across runs.');

      // Show differences
      console.log('\n📊 Differences:');
      if (snapshot1.workspaces !== snapshot2.workspaces) {
        console.log(`   Workspaces: ${snapshot1.workspaces} vs ${snapshot2.workspaces}`);
      }
      if (snapshot1.users !== snapshot2.users) {
        console.log(`   Users: ${snapshot1.users} vs ${snapshot2.users}`);
      }
      if (snapshot1.challenges !== snapshot2.challenges) {
        console.log(`   Challenges: ${snapshot1.challenges} vs ${snapshot2.challenges}`);
      }
      if (snapshot1.enrollments !== snapshot2.enrollments) {
        console.log(`   Enrollments: ${snapshot1.enrollments} vs ${snapshot2.enrollments}`);
      }

      // Compare arrays
      if (JSON.stringify(snapshot1.challengeTitles) !== JSON.stringify(snapshot2.challengeTitles)) {
        console.log(`   Challenge titles differ`);
        console.log(`   Run 1 first 3: ${snapshot1.challengeTitles.slice(0, 3).join(', ')}`);
        console.log(`   Run 2 first 3: ${snapshot2.challengeTitles.slice(0, 3).join(', ')}`);
      }
      if (JSON.stringify(snapshot1.userEmails) !== JSON.stringify(snapshot2.userEmails)) {
        console.log(`   User emails differ`);
      }
      if (JSON.stringify(snapshot1.pointsBalances) !== JSON.stringify(snapshot2.pointsBalances)) {
        console.log(`   Points balances differ`);
        console.log(`   Run 1 first 3: ${JSON.stringify(snapshot1.pointsBalances.slice(0, 3))}`);
        console.log(`   Run 2 first 3: ${JSON.stringify(snapshot2.pointsBalances.slice(0, 3))}`);
      }

      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
