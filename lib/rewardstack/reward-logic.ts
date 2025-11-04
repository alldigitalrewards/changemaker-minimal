/**
 * RewardSTACK Reward Issuance Logic
 * Handles point adjustments and catalog item transactions via RewardSTACK API
 *
 * API Version: 2.2
 * Endpoints:
 * - POST /api/2.2/programs/{programId}/participants/{participantId}/adjustments (points)
 * - POST /api/2.2/programs/{programId}/participants/{participantId}/transactions (SKU)
 */

import { prisma } from "../prisma";
import { generateRewardStackToken, getRewardStackBaseUrl } from "./auth";
import { syncParticipantToRewardStack } from "./participant-sync";
import { RewardStackStatus, RewardStatus, RewardType } from "@prisma/client";

/**
 * RewardSTACK point adjustment request
 */
interface PointAdjustmentRequest {
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * RewardSTACK catalog transaction request
 */
interface CatalogTransactionRequest {
  skuId: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * RewardSTACK API error response
 */
interface RewardStackError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Reward issuance result
 */
export interface RewardIssuanceResult {
  success: boolean;
  rewardIssuanceId?: string;
  transactionId?: string;
  adjustmentId?: string;
  error?: string;
  details?: unknown;
}

/**
 * Retry configuration for API calls
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay =
    RETRY_CONFIG.initialDelayMs *
    Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Check if error is retryable (5xx server errors)
 */
function isRetryableError(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600;
}

/**
 * Execute API call with exponential backoff retry
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (
        error instanceof Error &&
        error.message.includes("RewardSTACK server error") &&
        attempt < RETRY_CONFIG.maxAttempts - 1
      ) {
        const delay = getRetryDelay(attempt);
        console.warn(
          `${context} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}), retrying in ${delay}ms...`,
          error.message
        );
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max attempts reached
      throw error;
    }
  }

  throw lastError || new Error(`${context} failed after all retry attempts`);
}

/**
 * Update RewardIssuance record with transaction result
 */
async function updateRewardIssuance(
  rewardIssuanceId: string,
  updates: {
    status?: RewardStatus;
    rewardStackStatus?: RewardStackStatus;
    rewardStackTransactionId?: string;
    rewardStackAdjustmentId?: string;
    rewardStackErrorMessage?: string;
    issuedAt?: Date;
    externalResponse?: unknown;
  }
): Promise<void> {
  await prisma.rewardIssuance.update({
    where: { id: rewardIssuanceId },
    data: updates,
  });
}

/**
 * Ensure participant is synced to RewardSTACK
 * If not synced or sync failed, attempts to sync before proceeding
 */
async function ensureParticipantSynced(
  userId: string,
  workspaceId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      rewardStackParticipantId: true,
      rewardStackSyncStatus: true,
    },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Check if participant is already synced
  if (
    user.rewardStackParticipantId &&
    user.rewardStackSyncStatus === "SYNCED"
  ) {
    return user.rewardStackParticipantId;
  }

  // Participant not synced or sync failed - attempt sync
  console.log(
    `Participant ${user.email} not synced to RewardSTACK, syncing now...`
  );

  const syncResult = await syncParticipantToRewardStack(userId, workspaceId);

  if (!syncResult.success || !syncResult.participantId) {
    throw new Error(
      `Failed to sync participant to RewardSTACK: ${syncResult.error || "Unknown error"}`
    );
  }

  return syncResult.participantId;
}

/**
 * Validate workspace RewardSTACK configuration
 */
async function validateWorkspaceConfig(workspaceId: string): Promise<{
  programId: string;
}> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      rewardStackEnabled: true,
      rewardStackProgramId: true,
    },
  });

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  if (!workspace.rewardStackEnabled) {
    throw new Error(
      `RewardSTACK integration is not enabled for workspace ${workspaceId}`
    );
  }

  if (!workspace.rewardStackProgramId) {
    throw new Error(
      `RewardSTACK program ID not configured for workspace ${workspaceId}`
    );
  }

  return {
    programId: workspace.rewardStackProgramId,
  };
}

/**
 * Generate idempotency key for reward issuance
 */
function generateIdempotencyKey(
  rewardIssuanceId: string,
  type: "adjustment" | "transaction"
): string {
  return `changemaker-${type}-${rewardIssuanceId}`;
}

/**
 * Check if reward was already issued (idempotency check)
 */
async function checkExistingIssuance(
  rewardIssuanceId: string
): Promise<boolean> {
  const existing = await prisma.rewardIssuance.findUnique({
    where: { id: rewardIssuanceId },
    select: {
      status: true,
      rewardStackStatus: true,
      rewardStackTransactionId: true,
      rewardStackAdjustmentId: true,
    },
  });

  if (!existing) {
    return false;
  }

  // Already issued successfully
  if (
    existing.status === "ISSUED" &&
    existing.rewardStackStatus === "COMPLETED"
  ) {
    return true;
  }

  // Has external ID - already processed
  if (existing.rewardStackTransactionId || existing.rewardStackAdjustmentId) {
    return true;
  }

  return false;
}

/**
 * Issue point adjustment via RewardSTACK API
 * POST /api/2.2/programs/{programId}/participants/{participantId}/adjustments
 *
 * @param rewardIssuanceId - RewardIssuance record ID
 * @returns Reward issuance result
 */
export async function issuePointsAdjustment(
  rewardIssuanceId: string
): Promise<RewardIssuanceResult> {
  try {
    // Check if already issued (idempotency)
    const alreadyIssued = await checkExistingIssuance(rewardIssuanceId);
    if (alreadyIssued) {
      return {
        success: true,
        rewardIssuanceId,
        details: { action: "already_issued" },
      };
    }

    // Get reward issuance details
    const rewardIssuance = await prisma.rewardIssuance.findUnique({
      where: { id: rewardIssuanceId },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        challengeId: true,
        type: true,
        amount: true,
        metadata: true,
      },
    });

    if (!rewardIssuance) {
      throw new Error(`RewardIssuance not found: ${rewardIssuanceId}`);
    }

    if (rewardIssuance.type !== "points") {
      throw new Error(
        `Invalid reward type for point adjustment: ${rewardIssuance.type}`
      );
    }

    if (!rewardIssuance.amount || rewardIssuance.amount <= 0) {
      throw new Error(
        `Invalid point amount: ${rewardIssuance.amount}`
      );
    }

    // Validate workspace configuration
    const { programId } = await validateWorkspaceConfig(
      rewardIssuance.workspaceId
    );

    // Ensure participant is synced
    const participantId = await ensureParticipantSynced(
      rewardIssuance.userId,
      rewardIssuance.workspaceId
    );

    // Update status to PROCESSING
    await updateRewardIssuance(rewardIssuanceId, {
      status: "PENDING",
      rewardStackStatus: "PROCESSING",
    });

    // Prepare adjustment request
    const adjustmentRequest: PointAdjustmentRequest = {
      amount: rewardIssuance.amount,
      reason: `Challenge reward - ${rewardIssuance.challengeId || "Manual"}`,
      metadata: {
        ...(rewardIssuance.metadata as Record<string, unknown>),
        changemaker_reward_id: rewardIssuanceId,
        changemaker_challenge_id: rewardIssuance.challengeId,
      },
      idempotencyKey: generateIdempotencyKey(rewardIssuanceId, "adjustment"),
    };

    // Call RewardSTACK API with retry
    const result = await executeWithRetry(async () => {
      const token = await generateRewardStackToken(
        rewardIssuance.workspaceId
      );
      const baseUrl = await getRewardStackBaseUrl(
        rewardIssuance.workspaceId
      );

      const url = `${baseUrl}/api/2.2/programs/${encodeURIComponent(programId)}/participants/${encodeURIComponent(participantId)}/adjustments`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adjustmentRequest),
      });

      // Handle error responses
      if (!response.ok) {
        const errorData: RewardStackError = await response
          .json()
          .catch(() => ({ message: `HTTP ${response.status}` }));

        // Classify errors
        if (response.status === 400) {
          throw new Error(
            `Invalid adjustment request: ${errorData.message || "Validation failed"}`
          );
        }

        if (response.status === 401) {
          throw new Error("Authentication failed: Invalid API key");
        }

        if (response.status === 403) {
          throw new Error(
            "Access forbidden: Insufficient permissions"
          );
        }

        if (response.status === 404) {
          throw new Error(
            `Participant not found: ${participantId}`
          );
        }

        if (response.status === 409) {
          throw new Error(
            `Duplicate adjustment: ${errorData.message || "Adjustment already exists"}`
          );
        }

        if (response.status === 429) {
          throw new Error("Rate limit exceeded: Too many requests");
        }

        if (response.status >= 500) {
          throw new Error(
            `RewardSTACK server error: ${errorData.message || "Internal server error"}`
          );
        }

        throw new Error(
          `Failed to create adjustment: ${errorData.message || `HTTP ${response.status}`}`
        );
      }

      return await response.json();
    }, `Point adjustment for ${rewardIssuanceId}`);

    // Extract adjustment ID from response
    const adjustmentId = result.id || result.adjustmentId;

    if (!adjustmentId) {
      throw new Error("RewardSTACK did not return adjustment ID");
    }

    // Update reward issuance with success
    await updateRewardIssuance(rewardIssuanceId, {
      status: "ISSUED",
      rewardStackStatus: "COMPLETED",
      rewardStackAdjustmentId: adjustmentId,
      issuedAt: new Date(),
      externalResponse: result,
    });

    // Log success event
    await prisma.activityEvent.create({
      data: {
        type: "WORKSPACE_SETTINGS_UPDATED",
        metadata: {
          action: "rewardstack_point_adjustment_issued",
          rewardIssuanceId,
          adjustmentId,
          amount: rewardIssuance.amount,
          timestamp: new Date().toISOString(),
        },
        userId: rewardIssuance.userId,
        workspaceId: rewardIssuance.workspaceId,
      },
    });

    return {
      success: true,
      rewardIssuanceId,
      adjustmentId,
      details: { amount: rewardIssuance.amount, participantId },
    };
  } catch (error) {
    // Update reward issuance with failure
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await updateRewardIssuance(rewardIssuanceId, {
      status: "FAILED",
      rewardStackStatus: "FAILED",
      rewardStackErrorMessage: errorMessage,
    });

    console.error(
      `Failed to issue point adjustment ${rewardIssuanceId}:`,
      error
    );

    return {
      success: false,
      rewardIssuanceId,
      error: errorMessage,
    };
  }
}

/**
 * Issue catalog item transaction via RewardSTACK API
 * POST /api/2.2/programs/{programId}/participants/{participantId}/transactions
 *
 * @param rewardIssuanceId - RewardIssuance record ID
 * @returns Reward issuance result
 */
export async function issueCatalogReward(
  rewardIssuanceId: string
): Promise<RewardIssuanceResult> {
  try {
    // Check if already issued (idempotency)
    const alreadyIssued = await checkExistingIssuance(rewardIssuanceId);
    if (alreadyIssued) {
      return {
        success: true,
        rewardIssuanceId,
        details: { action: "already_issued" },
      };
    }

    // Get reward issuance details
    const rewardIssuance = await prisma.rewardIssuance.findUnique({
      where: { id: rewardIssuanceId },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        challengeId: true,
        type: true,
        skuId: true,
        metadata: true,
      },
    });

    if (!rewardIssuance) {
      throw new Error(`RewardIssuance not found: ${rewardIssuanceId}`);
    }

    if (rewardIssuance.type !== "sku") {
      throw new Error(
        `Invalid reward type for catalog transaction: ${rewardIssuance.type}`
      );
    }

    if (!rewardIssuance.skuId) {
      throw new Error("SKU ID is required for catalog rewards");
    }

    // Validate workspace configuration
    const { programId } = await validateWorkspaceConfig(
      rewardIssuance.workspaceId
    );

    // Ensure participant is synced
    const participantId = await ensureParticipantSynced(
      rewardIssuance.userId,
      rewardIssuance.workspaceId
    );

    // Update status to PROCESSING
    await updateRewardIssuance(rewardIssuanceId, {
      status: "PENDING",
      rewardStackStatus: "PROCESSING",
    });

    // Prepare transaction request
    const transactionRequest: CatalogTransactionRequest = {
      skuId: rewardIssuance.skuId,
      quantity: 1, // Default to 1 for challenge rewards
      metadata: {
        ...(rewardIssuance.metadata as Record<string, unknown>),
        changemaker_reward_id: rewardIssuanceId,
        changemaker_challenge_id: rewardIssuance.challengeId,
      },
      idempotencyKey: generateIdempotencyKey(rewardIssuanceId, "transaction"),
    };

    // Call RewardSTACK API with retry
    const result = await executeWithRetry(async () => {
      const token = await generateRewardStackToken(
        rewardIssuance.workspaceId
      );
      const baseUrl = await getRewardStackBaseUrl(
        rewardIssuance.workspaceId
      );

      const url = `${baseUrl}/api/2.2/programs/${encodeURIComponent(programId)}/participants/${encodeURIComponent(participantId)}/transactions`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionRequest),
      });

      // Handle error responses
      if (!response.ok) {
        const errorData: RewardStackError = await response
          .json()
          .catch(() => ({ message: `HTTP ${response.status}` }));

        // Classify errors
        if (response.status === 400) {
          throw new Error(
            `Invalid transaction request: ${errorData.message || "Validation failed"}`
          );
        }

        if (response.status === 401) {
          throw new Error("Authentication failed: Invalid API key");
        }

        if (response.status === 403) {
          throw new Error(
            "Access forbidden: Insufficient permissions"
          );
        }

        if (response.status === 404) {
          throw new Error(
            `Participant or SKU not found: ${errorData.message || participantId}`
          );
        }

        if (response.status === 409) {
          throw new Error(
            `Duplicate transaction: ${errorData.message || "Transaction already exists"}`
          );
        }

        if (response.status === 429) {
          throw new Error("Rate limit exceeded: Too many requests");
        }

        if (response.status >= 500) {
          throw new Error(
            `RewardSTACK server error: ${errorData.message || "Internal server error"}`
          );
        }

        throw new Error(
          `Failed to create transaction: ${errorData.message || `HTTP ${response.status}`}`
        );
      }

      return await response.json();
    }, `Catalog transaction for ${rewardIssuanceId}`);

    // Extract transaction ID from response
    const transactionId = result.id || result.transactionId;

    if (!transactionId) {
      throw new Error("RewardSTACK did not return transaction ID");
    }

    // Update reward issuance with success
    await updateRewardIssuance(rewardIssuanceId, {
      status: "ISSUED",
      rewardStackStatus: "COMPLETED",
      rewardStackTransactionId: transactionId,
      issuedAt: new Date(),
      externalResponse: result,
    });

    // Log success event
    await prisma.activityEvent.create({
      data: {
        type: "WORKSPACE_SETTINGS_UPDATED",
        metadata: {
          action: "rewardstack_catalog_transaction_issued",
          rewardIssuanceId,
          transactionId,
          skuId: rewardIssuance.skuId,
          timestamp: new Date().toISOString(),
        },
        userId: rewardIssuance.userId,
        workspaceId: rewardIssuance.workspaceId,
      },
    });

    return {
      success: true,
      rewardIssuanceId,
      transactionId,
      details: { skuId: rewardIssuance.skuId, participantId },
    };
  } catch (error) {
    // Update reward issuance with failure
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await updateRewardIssuance(rewardIssuanceId, {
      status: "FAILED",
      rewardStackStatus: "FAILED",
      rewardStackErrorMessage: errorMessage,
    });

    console.error(
      `Failed to issue catalog reward ${rewardIssuanceId}:`,
      error
    );

    return {
      success: false,
      rewardIssuanceId,
      error: errorMessage,
    };
  }
}

/**
 * Issue reward transaction (routes to appropriate API based on type)
 * Main entry point for reward issuance
 *
 * @param rewardIssuanceId - RewardIssuance record ID
 * @returns Reward issuance result
 */
export async function issueRewardTransaction(
  rewardIssuanceId: string
): Promise<RewardIssuanceResult> {
  // Get reward type
  const rewardIssuance = await prisma.rewardIssuance.findUnique({
    where: { id: rewardIssuanceId },
    select: { type: true },
  });

  if (!rewardIssuance) {
    return {
      success: false,
      error: `RewardIssuance not found: ${rewardIssuanceId}`,
    };
  }

  // Route to appropriate API based on reward type
  switch (rewardIssuance.type) {
    case "points":
      return issuePointsAdjustment(rewardIssuanceId);
    case "sku":
      return issueCatalogReward(rewardIssuanceId);
    case "monetary":
      // Not implemented yet - would use another RewardSTACK endpoint
      return {
        success: false,
        error: "Monetary rewards not yet implemented",
      };
    default:
      return {
        success: false,
        error: `Unsupported reward type: ${rewardIssuance.type}`,
      };
  }
}
