import {
  User,
  Challenge,
  WorkspaceMembership,
  ChallengeAssignment,
  Enrollment,
  Role,
} from '@prisma/client';
import { prisma } from '@/lib/db';

export type ChallengePermissions = {
  role: 'ADMIN' | 'CHALLENGE_MANAGER' | 'MANAGER' | 'PARTICIPANT';
  permissions: string[];
  canApproveSubmissions: boolean;
  canEnroll: boolean;
  canManage: boolean;
  isParticipant: boolean;
  isManager: boolean;
  isAdmin: boolean;
};

/**
 * Determines a user's effective role and permissions for a specific challenge.
 *
 * Permission hierarchy (highest to lowest):
 * 1. Workspace Admin Override - full control
 * 2. Challenge-Specific Management - manager for this challenge
 * 3. Challenge-Specific Participation - participant in this challenge
 * 4. Workspace Role Fallback - default workspace permissions
 */
export function getUserChallengePermissions(
  workspaceMembership: WorkspaceMembership,
  challengeAssignment?: ChallengeAssignment | null,
  enrollment?: Enrollment | null,
): ChallengePermissions {
  // 1. Workspace Admin Override
  if (workspaceMembership.role === 'ADMIN') {
    return {
      role: 'ADMIN',
      permissions: [
        'full_control',
        'manage_challenge',
        'participate',
        'approve_submissions',
        'view_all',
      ],
      canApproveSubmissions: true,
      canEnroll: true,
      canManage: true,
      isParticipant: !!enrollment,
      isManager: true,
      isAdmin: true,
    };
  }

  // 2. Challenge-Specific Management
  if (challengeAssignment) {
    return {
      role: 'CHALLENGE_MANAGER',
      permissions: [
        'manage_challenge',
        'approve_submissions',
        'participate',
        'view_all',
      ],
      canApproveSubmissions: true,
      canEnroll: true,
      canManage: true,
      isParticipant: !!enrollment,
      isManager: true,
      isAdmin: false,
    };
  }

  // 3. Challenge-Specific Participation
  if (enrollment) {
    return {
      role: 'PARTICIPANT',
      permissions: ['participate', 'submit_activities', 'view_challenge'],
      canApproveSubmissions: false,
      canEnroll: false, // Already enrolled
      canManage: false,
      isParticipant: true,
      isManager: false,
      isAdmin: false,
    };
  }

  // 4. Workspace Role Fallback
  if (workspaceMembership.role === 'MANAGER') {
    return {
      role: 'MANAGER',
      permissions: [
        'manage_challenge',
        'approve_submissions',
        'view_all_challenges',
      ],
      canApproveSubmissions: true,
      canEnroll: true,
      canManage: true,
      isParticipant: false,
      isManager: true,
      isAdmin: false,
    };
  }

  // Default participant view
  return {
    role: 'PARTICIPANT',
    permissions: ['view_challenge'],
    canApproveSubmissions: false,
    canEnroll: true,
    canManage: false,
    isParticipant: false,
    isManager: false,
    isAdmin: false,
  };
}

/**
 * Business rule: Prevent self-approval of submissions
 */
export function canApproveSubmission(
  permissions: ChallengePermissions,
  submissionUserId: string,
  currentUserId: string,
): boolean {
  if (!permissions.canApproveSubmissions) {
    return false;
  }

  // Prevent self-approval
  if (submissionUserId === currentUserId) {
    return false;
  }

  return true;
}

/**
 * Helper to fetch all permission-related data for a user and challenge
 */
export async function fetchUserChallengeContext(
  userId: string,
  challengeId: string,
  workspaceId: string,
) {
  const [membership, assignment, enrollment] = await Promise.all([
    prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    }),
    prisma.challengeAssignment.findFirst({
      where: {
        managerId: userId,
        challengeId,
      },
    }),
    prisma.enrollment.findUnique({
      where: {
        userId_challengeId: { userId, challengeId },
      },
    }),
  ]);

  if (!membership) {
    throw new Error('User is not a member of this workspace');
  }

  return {
    membership,
    assignment,
    enrollment,
    permissions: getUserChallengePermissions(membership, assignment, enrollment),
  };
}
