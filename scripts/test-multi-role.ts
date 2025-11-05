/**
 * Script to test the multi-role capability system
 * Tests permission resolution for users with multiple roles
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import {
  getUserChallengePermissions,
  canApproveSubmission,
  fetchUserChallengeContext,
} from '../lib/auth/challenge-permissions';

dotenv.config({ path: '.env.local' });

// Use DIRECT_URL to bypass PgBouncer
if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing Multi-Role Capabilities System...\n');

  // Find krobinson user
  const krobinson = await prisma.user.findUnique({
    where: { email: 'krobinson@alldigitalrewards.com' },
  });

  if (!krobinson) {
    console.log('❌ krobinson user not found');
    return;
  }

  console.log(`✓ Found user: ${krobinson.email}`);

  // Find a workspace where krobinson is an admin
  const membership = await prisma.workspaceMembership.findFirst({
    where: {
      userId: krobinson.id,
      role: 'ADMIN',
    },
    include: {
      Workspace: true,
    },
  });

  if (!membership) {
    console.log('❌ No admin membership found');
    return;
  }

  console.log(`✓ Found admin workspace: ${membership.Workspace.name}`);

  // Find a challenge in this workspace
  const challenge = await prisma.challenge.findFirst({
    where: {
      workspaceId: membership.workspaceId,
      status: 'PUBLISHED',
    },
  });

  if (!challenge) {
    console.log('❌ No published challenge found');
    return;
  }

  console.log(`✓ Found challenge: ${challenge.title}\n`);

  // Check base permissions (no enrollment)
  console.log('=== Scenario 1: Admin (Not Enrolled) ===');
  const basePermissions = getUserChallengePermissions(membership, null, null);
  console.log('Role:', basePermissions.role);
  console.log('Can Approve:', basePermissions.canApproveSubmissions);
  console.log('Can Enroll:', basePermissions.canEnroll);
  console.log('Can Manage:', basePermissions.canManage);
  console.log('Is Participant:', basePermissions.isParticipant);
  console.log('Is Manager:', basePermissions.isManager);
  console.log('Is Admin:', basePermissions.isAdmin);
  console.log();

  // Check if user is enrolled
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_challengeId: {
        userId: krobinson.id,
        challengeId: challenge.id,
      },
    },
  });

  if (enrollment) {
    console.log('=== Scenario 2: Admin with Enrollment ===');
    const enrolledPermissions = getUserChallengePermissions(
      membership,
      null,
      enrollment,
    );
    console.log('Role:', enrolledPermissions.role);
    console.log('Can Approve:', enrolledPermissions.canApproveSubmissions);
    console.log('Can Enroll:', enrolledPermissions.canEnroll);
    console.log('Can Manage:', enrolledPermissions.canManage);
    console.log('Is Participant:', enrolledPermissions.isParticipant);
    console.log('Is Manager:', enrolledPermissions.isManager);
    console.log('Is Admin:', enrolledPermissions.isAdmin);
    console.log();

    // Test self-approval prevention
    console.log('=== Self-Approval Prevention Test ===');
    const canApproveOwn = canApproveSubmission(
      enrolledPermissions,
      krobinson.id,
      krobinson.id,
    );
    console.log(
      'Can approve own submission:',
      canApproveOwn,
      canApproveOwn ? '❌ FAIL' : '✓ PASS',
    );

    // Find another user
    const otherUser = await prisma.user.findFirst({
      where: {
        id: { not: krobinson.id },
      },
    });

    if (otherUser) {
      const canApproveOther = canApproveSubmission(
        enrolledPermissions,
        otherUser.id,
        krobinson.id,
      );
      console.log(
        "Can approve other user's submission:",
        canApproveOther,
        canApproveOther ? '✓ PASS' : '❌ FAIL',
      );
    }
    console.log();
  } else {
    console.log('ℹ️  Admin is not enrolled in this challenge');
    console.log('   Run enrollment flow to test full multi-role capabilities\n');
  }

  // Test challenge-specific manager assignment
  const assignment = await prisma.challengeAssignment.findFirst({
    where: {
      challengeId: challenge.id,
    },
    include: {
      Manager: true,
    },
  });

  if (assignment) {
    console.log('=== Scenario 3: Challenge-Specific Manager ===');
    const managerMembership = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: assignment.managerId,
          workspaceId: membership.workspaceId,
        },
      },
    });

    if (managerMembership) {
      const managerEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_challengeId: {
            userId: assignment.managerId,
            challengeId: challenge.id,
          },
        },
      });

      const managerPermissions = getUserChallengePermissions(
        managerMembership,
        assignment,
        managerEnrollment,
      );

      console.log('Manager:', assignment.Manager.email);
      console.log('Role:', managerPermissions.role);
      console.log('Can Approve:', managerPermissions.canApproveSubmissions);
      console.log('Can Enroll:', managerPermissions.canEnroll);
      console.log('Can Manage:', managerPermissions.canManage);
      console.log('Is Participant:', managerPermissions.isParticipant);
      console.log('Is Manager:', managerPermissions.isManager);
      console.log('Is Admin:', managerPermissions.isAdmin);
      console.log();
    }
  }

  // Test the full context fetcher
  console.log('=== Testing fetchUserChallengeContext ===');
  try {
    const context = await fetchUserChallengeContext(
      krobinson.id,
      challenge.id,
      membership.workspaceId,
    );
    console.log('✓ Context fetched successfully');
    console.log('  Has membership:', !!context.membership);
    console.log('  Has assignment:', !!context.assignment);
    console.log('  Has enrollment:', !!context.enrollment);
    console.log('  Effective role:', context.permissions.role);
  } catch (error) {
    console.error('❌ Error fetching context:', error);
  }

  console.log('\n✅ Multi-role capability tests complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
