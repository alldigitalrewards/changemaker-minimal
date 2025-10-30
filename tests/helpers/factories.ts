import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';

/**
 * Test Data Factory Helpers
 *
 * Reusable functions for creating test data in manager-related tests.
 * Reduces duplication and makes tests more maintainable.
 */

// Constants from seed data
export const WORKSPACE_SLUG = 'alldigitalrewards';
export const MANAGER_EMAIL = 'tom.manager@alldigitalrewards.com';
export const PARTICIPANT_EMAIL = 'sarah.jones@alldigitalrewards.com';

export interface TestWorkspace {
  id: string;
  slug: string;
}

export interface TestManager {
  id: string;
  email: string;
}

export interface TestParticipant {
  id: string;
  email: string;
}

export interface TestChallenge {
  id: string;
  title: string;
  workspaceId: string;
}

export interface TestActivity {
  id: string;
  challengeId: string;
  templateId: string;
}

export interface TestSubmission {
  id: string;
  activityId: string;
  userId: string;
  status: string;
}

/**
 * Get workspace by slug
 */
export async function getTestWorkspace(slug: string = WORKSPACE_SLUG): Promise<TestWorkspace> {
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, slug: true }
  });

  if (!workspace) {
    throw new Error(`Workspace not found: ${slug}`);
  }

  return workspace;
}

/**
 * Get manager user by email
 */
export async function getTestManager(email: string = MANAGER_EMAIL): Promise<TestManager> {
  const manager = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true }
  });

  if (!manager) {
    throw new Error(`Manager not found: ${email}`);
  }

  return manager;
}

/**
 * Get participant user by email
 */
export async function getTestParticipant(email: string = PARTICIPANT_EMAIL): Promise<TestParticipant> {
  const participant = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true }
  });

  if (!participant) {
    throw new Error(`Participant not found: ${email}`);
  }

  return participant;
}

/**
 * Create a test challenge
 */
export async function createTestChallenge(params: {
  workspaceId: string;
  title?: string;
  status?: string;
}): Promise<TestChallenge> {
  const challengeId = randomUUID();
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const challenge = await prisma.challenge.create({
    data: {
      id: challengeId,
      title: params.title || `Test Challenge ${Date.now()}`,
      description: 'Test challenge',
      workspaceId: params.workspaceId,
      startDate: now,
      endDate: futureDate,
      status: (params.status as any) || 'PUBLISHED'
    },
    select: {
      id: true,
      title: true,
      workspaceId: true
    }
  });

  return challenge;
}

/**
 * Create challenge assignment for manager
 */
export async function createManagerAssignment(params: {
  challengeId: string;
  managerId: string;
  workspaceId: string;
  assignedBy?: string;
}) {
  return await prisma.challengeAssignment.create({
    data: {
      challengeId: params.challengeId,
      managerId: params.managerId,
      workspaceId: params.workspaceId,
      assignedBy: params.assignedBy || params.managerId
    }
  });
}

/**
 * Create manager with assigned challenge
 * Convenience function that creates challenge and assignment in one call
 */
export async function createManagerWithAssignment(params: {
  workspaceId: string;
  managerId: string;
  challengeTitle?: string;
}): Promise<{ challenge: TestChallenge; assignment: any }> {
  const challenge = await createTestChallenge({
    workspaceId: params.workspaceId,
    title: params.challengeTitle
  });

  const assignment = await createManagerAssignment({
    challengeId: challenge.id,
    managerId: params.managerId,
    workspaceId: params.workspaceId,
    assignedBy: params.managerId
  });

  return { challenge, assignment };
}

/**
 * Create activity template
 */
export async function createTestActivityTemplate(params: {
  workspaceId: string;
  name?: string;
  basePoints?: number;
}) {
  return await prisma.activityTemplate.create({
    data: {
      id: randomUUID(),
      name: params.name || `Test Activity ${Date.now()}`,
      description: 'Test activity',
      type: 'TEXT_SUBMISSION',
      basePoints: params.basePoints || 100,
      workspaceId: params.workspaceId
    }
  });
}

/**
 * Create activity for challenge
 */
export async function createTestActivity(params: {
  challengeId: string;
  templateId: string;
  position?: number;
  pointsValue?: number;
}): Promise<TestActivity> {
  const activity = await prisma.activity.create({
    data: {
      id: randomUUID(),
      challengeId: params.challengeId,
      templateId: params.templateId,
      pointsValue: params.pointsValue || 100,
      position: params.position || 0
    },
    select: {
      id: true,
      challengeId: true,
      templateId: true
    }
  });

  return activity;
}

/**
 * Create submission for activity
 */
export async function createTestSubmission(params: {
  activityId: string;
  userId: string;
  enrollmentId: string;
  status?: string;
  textContent?: string;
}): Promise<TestSubmission> {
  const submission = await prisma.activitySubmission.create({
    data: {
      id: randomUUID(),
      activityId: params.activityId,
      userId: params.userId,
      enrollmentId: params.enrollmentId,
      textContent: params.textContent || 'Test submission content',
      status: (params.status as any) || 'PENDING'
    },
    select: {
      id: true,
      activityId: true,
      userId: true,
      status: true
    }
  });

  return submission;
}

/**
 * Create submission for manager's challenge
 * Convenience function that creates activity template, activity, enrollment, and submission
 */
export async function createSubmissionForManager(params: {
  challengeId: string;
  workspaceId: string;
  participantId: string;
  status?: string;
}): Promise<{
  activityTemplate: any;
  activity: TestActivity;
  enrollment: any;
  submission: TestSubmission;
}> {
  const activityTemplate = await createTestActivityTemplate({
    workspaceId: params.workspaceId,
    name: `Test Activity for Challenge ${params.challengeId.substring(0, 8)}`
  });

  const activity = await createTestActivity({
    challengeId: params.challengeId,
    templateId: activityTemplate.id
  });

  // Create enrollment for participant
  const enrollment = await prisma.enrollment.create({
    data: {
      userId: params.participantId,
      challengeId: params.challengeId,
      status: 'ENROLLED'
    }
  });

  const submission = await createTestSubmission({
    activityId: activity.id,
    userId: params.participantId,
    enrollmentId: enrollment.id,
    status: params.status
  });

  return { activityTemplate, activity, enrollment, submission };
}

/**
 * Create complete test setup: workspace, manager, challenge, assignment, activity, submission
 * Use this for comprehensive test setups
 */
export async function createCompleteTestSetup(params?: {
  workspaceSlug?: string;
  managerEmail?: string;
  participantEmail?: string;
  challengeTitle?: string;
  submissionStatus?: string;
}) {
  const workspace = await getTestWorkspace(params?.workspaceSlug);
  const manager = await getTestManager(params?.managerEmail);
  const participant = await getTestParticipant(params?.participantEmail);

  const { challenge, assignment } = await createManagerWithAssignment({
    workspaceId: workspace.id,
    managerId: manager.id,
    challengeTitle: params?.challengeTitle
  });

  const { activityTemplate, activity, enrollment, submission } = await createSubmissionForManager({
    challengeId: challenge.id,
    workspaceId: workspace.id,
    participantId: participant.id,
    status: params?.submissionStatus
  });

  return {
    workspace,
    manager,
    participant,
    challenge,
    assignment,
    activityTemplate,
    activity,
    enrollment,
    submission
  };
}

/**
 * Cleanup helper - deletes challenge and all related data
 */
export async function cleanupTestChallenge(challengeId: string) {
  // Cleanup in reverse order of creation
  await prisma.activitySubmission.deleteMany({
    where: {
      Activity: { challengeId }
    }
  });

  await prisma.activity.deleteMany({
    where: { challengeId }
  });

  await prisma.challengeAssignment.deleteMany({
    where: { challengeId }
  });

  await prisma.challenge.deleteMany({
    where: { id: challengeId }
  });
}

/**
 * Cleanup helper - deletes activity template
 */
export async function cleanupTestActivityTemplate(activityTemplateId: string) {
  await prisma.activityTemplate.deleteMany({
    where: { id: activityTemplateId }
  });
}
