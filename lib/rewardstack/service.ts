/**
 * RewardSTACK Service Layer
 * High-level service for common RewardSTACK operations
 */

import { createRewardStackClient, buildEndpoint } from "./client";
import { getWorkspaceBySlug } from "../db/queries";
import type {
  PointAdjustmentResponse,
  SsoUrlResponse,
  AdjustmentRequest,
  RewardStackParticipant,
} from "./types";

/**
 * Issue points to a participant
 *
 * @param workspaceId - Workspace UUID or slug
 * @param userId - User UUID (used as uniqueId in RewardSTACK)
 * @param amount - Points to credit (positive) or debit (negative)
 * @param description - Description of the adjustment
 * @returns Adjustment response with new balance
 */
export async function issuePoints(
  workspaceId: string,
  userId: string,
  amount: number,
  description: string
): Promise<PointAdjustmentResponse> {
  const workspace = await getWorkspaceBySlug(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  if (!workspace.rewardStackEnabled) {
    throw new Error(`RewardSTACK not enabled for workspace: ${workspace.slug}`);
  }

  const programId = workspace.rewardStackProgramId || process.env.REWARDSTACK_PROGRAM_ID;
  if (!programId) {
    throw new Error(`RewardSTACK program ID not configured for workspace: ${workspace.slug}`);
  }

  const client = await createRewardStackClient(workspaceId);

  const endpoint = buildEndpoint("/api/program/{programId}/participant/{uniqueId}/adjustment", {
    programId,
    uniqueId: userId,
  });

  const body: AdjustmentRequest = {
    amount,
    reason: description,
  };

  return await client.request<PointAdjustmentResponse>(endpoint, {
    method: "POST",
    body,
  });
}

/**
 * Generate SSO URL for participant to access marketplace
 *
 * @param workspaceId - Workspace UUID or slug
 * @param userId - User UUID (used as uniqueId in RewardSTACK)
 * @returns SSO URL and expiration
 */
export async function generateMarketplaceSsoUrl(
  workspaceId: string,
  userId: string
): Promise<SsoUrlResponse> {
  const workspace = await getWorkspaceBySlug(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  if (!workspace.rewardStackEnabled) {
    throw new Error(`RewardSTACK not enabled for workspace: ${workspace.slug}`);
  }

  const programId = workspace.rewardStackProgramId || process.env.REWARDSTACK_PROGRAM_ID;
  if (!programId) {
    throw new Error(`RewardSTACK program ID not configured for workspace: ${workspace.slug}`);
  }

  const client = await createRewardStackClient(workspaceId);

  const endpoint = buildEndpoint("/api/program/{programId}/participant/{uniqueId}/sso", {
    programId,
    uniqueId: userId,
  });

  return await client.request<SsoUrlResponse>(endpoint, {
    method: "POST",
  });
}

/**
 * Get participant details from RewardSTACK
 *
 * @param workspaceId - Workspace UUID or slug
 * @param userId - User UUID (used as uniqueId in RewardSTACK)
 * @returns Participant details including balance
 */
export async function getParticipant(
  workspaceId: string,
  userId: string
): Promise<RewardStackParticipant> {
  const workspace = await getWorkspaceBySlug(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  if (!workspace.rewardStackEnabled) {
    throw new Error(`RewardSTACK not enabled for workspace: ${workspace.slug}`);
  }

  const programId = workspace.rewardStackProgramId || process.env.REWARDSTACK_PROGRAM_ID;
  if (!programId) {
    throw new Error(`RewardSTACK program ID not configured for workspace: ${workspace.slug}`);
  }

  const client = await createRewardStackClient(workspaceId);

  const endpoint = buildEndpoint("/api/program/{programId}/participant/{uniqueId}", {
    programId,
    uniqueId: userId,
  });

  return await client.request<RewardStackParticipant>(endpoint, {
    method: "GET",
  });
}

/**
 * Create or update participant in RewardSTACK
 *
 * @param workspaceId - Workspace UUID or slug
 * @param participant - Participant data
 * @returns Created/updated participant
 */
export async function syncParticipant(
  workspaceId: string,
  participant: RewardStackParticipant
): Promise<RewardStackParticipant> {
  const workspace = await getWorkspaceBySlug(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  if (!workspace.rewardStackEnabled) {
    throw new Error(`RewardSTACK not enabled for workspace: ${workspace.slug}`);
  }

  const programId = workspace.rewardStackProgramId || process.env.REWARDSTACK_PROGRAM_ID;
  if (!programId) {
    throw new Error(`RewardSTACK program ID not configured for workspace: ${workspace.slug}`);
  }

  const client = await createRewardStackClient(workspaceId);

  // Try to create first, fall back to update if participant exists
  try {
    const endpoint = buildEndpoint("/api/program/{programId}/participant", {
      programId,
    });

    return await client.request<RewardStackParticipant>(endpoint, {
      method: "POST",
      body: participant,
    });
  } catch (error: any) {
    // If participant already exists (409 Conflict), update instead
    if (error.statusCode === 409) {
      const endpoint = buildEndpoint("/api/program/{programId}/participant/{uniqueId}", {
        programId,
        uniqueId: participant.uniqueId,
      });

      return await client.request<RewardStackParticipant>(endpoint, {
        method: "PUT",
        body: participant,
      });
    }
    throw error;
  }
}
