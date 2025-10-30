/**
 * Challenge Factory
 *
 * Creates challenges with deterministic, template-based data
 * Eliminates Math.random() usage for predictable test outcomes
 */

import { PrismaClient, RewardType } from "@prisma/client";
import { randomUUID } from "crypto";

export interface ChallengeTemplate {
  title: string;
  description: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  rewardType?: RewardType | null;
  rewardConfig?: any;
  daysFromNowStart?: number; // Default: 0 (starts now)
  durationDays?: number; // Default: 30
  enrollmentDeadlineDaysBefore?: number; // Default: 7 (7 days before start)
}

export interface ChallengeData {
  id?: string;
  title: string;
  description: string;
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  enrollmentDeadline?: Date;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  rewardType?: RewardType | null;
  rewardConfig?: any;
}

export interface ChallengeFactoryOptions {
  prisma?: PrismaClient;
}

/**
 * Deterministic challenge templates
 * These replace the random challenge generation in seed.ts
 */
export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    title: "Innovation Sprint 2025",
    description:
      "Propose and develop innovative solutions to improve our customer experience using AI and automation.",
    status: "PUBLISHED",
    rewardType: RewardType.points,
    daysFromNowStart: 0,
    durationDays: 60,
  },
  {
    title: "Sustainability Challenge",
    description:
      "Create initiatives to reduce our carbon footprint and promote environmental responsibility.",
    status: "PUBLISHED",
    rewardType: RewardType.sku,
    rewardConfig: { skuId: "SKU-GIFT-10" },
    daysFromNowStart: 7,
    durationDays: 45,
  },
  {
    title: "Wellness & Wellbeing",
    description:
      "Design programs that enhance employee wellness and work-life balance.",
    status: "PUBLISHED",
    rewardType: RewardType.points,
    daysFromNowStart: 14,
    durationDays: 30,
  },
  {
    title: "Digital Transformation",
    description:
      "Identify opportunities to digitize and streamline our business processes.",
    status: "DRAFT",
    rewardType: null,
    daysFromNowStart: 21,
    durationDays: 60,
  },
  {
    title: "Community Outreach",
    description:
      "Develop partnerships and programs that give back to our local communities.",
    status: "ARCHIVED",
    rewardType: RewardType.monetary,
    rewardConfig: { amount: 50, currency: "USD" },
    daysFromNowStart: -30, // Already ended
    durationDays: 30,
  },
];

/**
 * Create a challenge from a template
 *
 * @param template - Challenge template
 * @param workspaceId - Workspace ID
 * @param options - Factory options
 * @returns Created challenge
 */
export async function createChallengeFromTemplate(
  template: ChallengeTemplate,
  workspaceId: string,
  options: ChallengeFactoryOptions = {},
) {
  const prisma = options.prisma || (await import("../../prisma")).prisma;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() + (template.daysFromNowStart || 0));

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (template.durationDays || 30));

  const enrollmentDeadline = new Date(startDate);
  enrollmentDeadline.setDate(
    enrollmentDeadline.getDate() -
      (template.enrollmentDeadlineDaysBefore || 7),
  );

  const challengeData: ChallengeData = {
    id: randomUUID(),
    title: template.title,
    description: template.description,
    workspaceId,
    startDate,
    endDate,
    enrollmentDeadline,
    status: template.status || "DRAFT",
    rewardType: template.rewardType,
    rewardConfig: template.rewardConfig,
  };

  return await createChallenge(challengeData, options);
}

/**
 * Create a challenge with explicit data
 *
 * @param data - Challenge data
 * @param options - Factory options
 * @returns Created challenge
 */
export async function createChallenge(
  data: ChallengeData,
  options: ChallengeFactoryOptions = {},
) {
  const prisma = options.prisma || (await import("../../prisma")).prisma;

  return await prisma.challenge.create({
    data: {
      id: data.id || randomUUID(),
      title: data.title,
      description: data.description,
      workspaceId: data.workspaceId,
      startDate: data.startDate,
      endDate: data.endDate,
      enrollmentDeadline: data.enrollmentDeadline,
      status: data.status as any,
      rewardType: data.rewardType as any,
      rewardConfig: data.rewardConfig || null,
    },
  });
}

/**
 * Create multiple challenges from templates
 * Deterministic replacement for random challenge generation
 *
 * @param workspaceId - Workspace ID
 * @param count - Number of challenges (defaults to 5)
 * @param options - Factory options
 * @returns Array of created challenges
 */
export async function createChallengesForWorkspace(
  workspaceId: string,
  count: number = 5,
  options: ChallengeFactoryOptions = {},
) {
  const templates = CHALLENGE_TEMPLATES.slice(0, count);
  const results = [];

  for (const template of templates) {
    const challenge = await createChallengeFromTemplate(
      template,
      workspaceId,
      options,
    );
    results.push(challenge);
  }

  return results;
}

/**
 * Create challenges for multiple workspaces
 *
 * @param workspaceIds - Array of workspace IDs
 * @param challengesPerWorkspace - Number of challenges per workspace
 * @param options - Factory options
 * @returns Map of workspace ID to challenges
 */
export async function createChallengesForWorkspaces(
  workspaceIds: string[],
  challengesPerWorkspace: number = 3,
  options: ChallengeFactoryOptions = {},
) {
  const results: Record<string, any[]> = {};

  for (const workspaceId of workspaceIds) {
    const challenges = await createChallengesForWorkspace(
      workspaceId,
      challengesPerWorkspace,
      options,
    );
    results[workspaceId] = challenges;
  }

  return results;
}

/**
 * Append workspace name to challenge title
 * Useful for distinguishing challenges across workspaces
 */
export function appendWorkspaceName(
  title: string,
  workspaceName: string,
): string {
  return `${title} - ${workspaceName}`;
}
