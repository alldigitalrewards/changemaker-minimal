/**
 * RewardSTACK Service Layer
 * High-level service for common RewardSTACK operations
 */

import { createRewardStackClient, buildEndpoint } from "./client";
import { prisma } from "../prisma";
import type {
  PointAdjustmentResponse,
  SsoUrlResponse,
  AdjustmentRequest,
  RewardStackParticipant,
  TransactionRequest,
  TransactionResponse,
  CatalogResponse,
} from "./types";

/**
 * Helper function to get workspace and validate RewardSTACK configuration
 * @internal
 */
async function getWorkspaceConfig(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      slug: true,
      rewardStackEnabled: true,
      rewardStackProgramId: true,
      rewardStackOrgId: true,
    },
  });

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

  return { workspace, programId };
}

/**
 * Issue points to a participant
 *
 * @param workspaceId - Workspace UUID
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
  const { programId } = await getWorkspaceConfig(workspaceId);
  const client = await createRewardStackClient(workspaceId);

  const endpoint = buildEndpoint("/api/program/{programId}/participant/{uniqueId}/adjustment", {
    programId,
    uniqueId: userId,
  });

  const body: AdjustmentRequest = {
    amount,
    type: 'credit', // Always credit for reward issuances
    description,
  };

  return await client.request<PointAdjustmentResponse>(endpoint, {
    method: "POST",
    body,
  });
}

/**
 * Create a transaction for SKU/catalog rewards
 *
 * @param workspaceId - Workspace UUID
 * @param userId - User UUID (used as uniqueId in RewardSTACK)
 * @param skuId - SKU ID from workspace catalog
 * @param description - Description of the transaction
 * @param quantity - Number of items (defaults to 1)
 * @returns Transaction response with transaction ID
 */
export async function createTransaction(
  workspaceId: string,
  userId: string,
  skuId: string,
  description: string,
  quantity: number = 1
): Promise<TransactionResponse> {
  const { programId } = await getWorkspaceConfig(workspaceId);
  const client = await createRewardStackClient(workspaceId);

  const endpoint = buildEndpoint("/api/program/{programId}/participant/{uniqueId}/transaction", {
    programId,
    uniqueId: userId,
  });

  const body: TransactionRequest = {
    description,
    products: [
      {
        sku: skuId,
        quantity,
      },
    ],
  };

  return await client.request<TransactionResponse>(endpoint, {
    method: "POST",
    body,
  });
}

/**
 * Generate SSO URL for participant to access marketplace
 *
 * @param workspaceId - Workspace UUID
 * @param userId - User UUID (used as uniqueId in RewardSTACK)
 * @returns SSO URL and expiration
 */
export async function generateMarketplaceSsoUrl(
  workspaceId: string,
  userId: string
): Promise<SsoUrlResponse> {
  const { programId } = await getWorkspaceConfig(workspaceId);
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
 * @param workspaceId - Workspace UUID
 * @param userId - User UUID (used as uniqueId in RewardSTACK)
 * @returns Participant details including balance
 */
export async function getParticipant(
  workspaceId: string,
  userId: string
): Promise<RewardStackParticipant> {
  const { programId } = await getWorkspaceConfig(workspaceId);
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
 * @param workspaceId - Workspace UUID
 * @param participant - Participant data
 * @returns Created/updated participant
 */
export async function syncParticipant(
  workspaceId: string,
  participant: RewardStackParticipant
): Promise<RewardStackParticipant> {
  const { programId } = await getWorkspaceConfig(workspaceId);
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

/**
 * Get catalog of available rewards from RewardSTACK
 *
 * @param workspaceId - Workspace UUID
 * @returns Catalog of available SKUs/products
 */
export async function getCatalog(
  workspaceId: string
): Promise<CatalogResponse> {
  const { programId } = await getWorkspaceConfig(workspaceId);
  const client = await createRewardStackClient(workspaceId);

  const endpoint = buildEndpoint("/api/program/{programId}/catalog", {
    programId,
  });

  return await client.request<CatalogResponse>(endpoint, {
    method: "GET",
  });
}
