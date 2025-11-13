/**
 * RewardSTACK Reward Issuance Logic
 * Handles point adjustments and catalog item transactions via RewardSTACK API
 *
 * API Endpoints (per official RewardSTACK docs):
 * - POST /api/program/{programId}/participant/{uniqueId}/adjustment (points)
 * - POST /api/program/{programId}/participant/{uniqueId}/transaction (SKU)
 *
 * Note: uniqueId is our internal user ID, not RewardSTACK's generated participantId
 */

import { prisma } from "../prisma";
import { generateRewardStackToken, getRewardStackBaseUrl } from "./auth";
import { syncParticipantToRewardStack, getParticipantFromRewardStack, getCountryCode } from "./participant-sync";
import { Prisma, RewardStackStatus, RewardStatus, RewardType } from "@prisma/client";
import { createShippingAddressNotification, hasIncompleteShippingAddress } from "@/lib/services/notifications";

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
    externalResponse?: Prisma.InputJsonValue;
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
 * POST /api/program/{programId}/participant/{participantId}/adjustment
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

    // Ensure participant is synced and get their RewardSTACK unique_id
    const uniqueId = await ensureParticipantSynced(
      rewardIssuance.userId,
      rewardIssuance.workspaceId
    );

    // Update status to PROCESSING
    await updateRewardIssuance(rewardIssuanceId, {
      status: "PENDING",
      rewardStackStatus: "PROCESSING",
    });

    // Prepare adjustment request (per RewardSTACK API v2 docs)
    const adjustmentRequest = {
      amount: rewardIssuance.amount,
      type: 'credit' as const, // Required by API
      description: `Challenge reward - ${rewardIssuance.challengeId || "Manual"}`, // Changed from "reason"
      metadata: {
        ...(rewardIssuance.metadata as Record<string, unknown>),
        changemaker_reward_id: rewardIssuanceId,
        changemaker_challenge_id: rewardIssuance.challengeId,
      },
    };

    // Call RewardSTACK API with retry
    const result = await executeWithRetry(async () => {
      const token = await generateRewardStackToken(
        rewardIssuance.workspaceId
      );
      const baseUrl = await getRewardStackBaseUrl(
        rewardIssuance.workspaceId
      );

      const url = `${baseUrl}/api/program/${encodeURIComponent(programId)}/participant/${encodeURIComponent(uniqueId)}/adjustment`;

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

        // Format error message (handle both string and array)
        const formatErrorMessage = (msg: unknown): string => {
          if (Array.isArray(msg)) {
            return msg.join('; ');
          }
          if (typeof msg === 'string') {
            return msg;
          }
          return 'Validation failed';
        };

        // Classify errors
        if (response.status === 400) {
          throw new Error(
            `Invalid adjustment request: ${formatErrorMessage(errorData.message)}`
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
            `Participant not found: ${uniqueId}`
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
      rewardStackAdjustmentId: String(adjustmentId), // Convert to string for Prisma
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
      details: { amount: rewardIssuance.amount, uniqueId },
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
 * POST /api/program/{programId}/participant/{participantId}/transaction
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

    // Ensure participant is synced and get their RewardSTACK unique_id
    const uniqueId = await ensureParticipantSynced(
      rewardIssuance.userId,
      rewardIssuance.workspaceId
    );

    // Validate participant has shipping address for catalog items
    const participant = await prisma.user.findUnique({
      where: { id: rewardIssuance.userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        phone: true,
        rewardStackParticipantId: true,
      },
    });

    if (!participant) {
      throw new Error(`User not found: ${rewardIssuance.userId}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 CATALOG REWARD ISSUANCE - Participant Address Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Participant:', {
      email: participant.email,
      name: `${participant.firstName || ''} ${participant.lastName || ''}`.trim(),
      rewardStackId: participant.rewardStackParticipantId || uniqueId,
    });
    console.log('\nAddress in Changemaker DB:');
    console.log('  Line 1:', participant.addressLine1 || '❌ MISSING');
    console.log('  Line 2:', participant.addressLine2 || '(not set)');
    console.log('  City:   ', participant.city || '❌ MISSING');
    console.log('  State:  ', participant.state || '❌ MISSING');
    console.log('  Zip:    ', participant.zipCode || '❌ MISSING');
    console.log('  Country:', participant.country || '❌ MISSING');
    console.log('  Phone:  ', participant.phone || '(not set)');

    // Check if required address fields are present
    const missingFields: string[] = [];
    if (!participant.addressLine1) missingFields.push('Street Address');
    if (!participant.city) missingFields.push('City');
    if (!participant.state) missingFields.push('State');
    if (!participant.zipCode) missingFields.push('Zip Code');
    if (!participant.country) missingFields.push('Country');

    if (missingFields.length > 0) {
      console.log('\n❌ VALIDATION FAILED - Missing required fields:', missingFields.join(', '));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Create notification for user to add shipping address
      try {
        const workspace = await prisma.workspace.findUnique({
          where: { id: rewardIssuance.workspaceId },
          select: { slug: true },
        });

        const skuDetails = await prisma.workspaceSku.findFirst({
          where: {
            workspaceId: rewardIssuance.workspaceId,
            skuId: rewardIssuance.skuId || '',
          },
          select: { name: true },
        });

        if (workspace) {
          await createShippingAddressNotification({
            userId: rewardIssuance.userId,
            workspaceId: rewardIssuance.workspaceId,
            workspaceSlug: workspace.slug,
            skuName: skuDetails?.name || 'your reward',
            rewardIssuanceId: rewardIssuanceId,
          });
        }
      } catch (notificationError) {
        console.error('Failed to create shipping address notification:', notificationError);
        // Don't fail the reward issuance if notification creation fails
      }

      throw new Error(
        `Participant missing required shipping address fields: ${missingFields.join(', ')}. Please update participant profile before issuing catalog rewards.`
      );
    }

    console.log('\n✅ Address validation passed - All required fields present');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Fetch participant from RewardSTACK to verify address data
    if (participant.rewardStackParticipantId) {
      console.log('🔍 Fetching participant data from RewardSTACK...\n');
      try {
        const rewardStackParticipant = await getParticipantFromRewardStack(
          rewardIssuance.workspaceId,
          programId,
          participant.rewardStackParticipantId
        );

      if (rewardStackParticipant) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📡 PARTICIPANT DATA IN REWARDSTACK');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Participant ID:', rewardStackParticipant.unique_id);
        console.log('Email:', rewardStackParticipant.email_address);
        console.log('Name:', `${rewardStackParticipant.firstname || ''} ${rewardStackParticipant.lastname || ''}`.trim() || '(not set)');
        console.log('\nAddress in RewardSTACK:');

        // Handle nested address object (new format)
        const address = (rewardStackParticipant as any).address;
        if (address && typeof address === 'object') {
          console.log('  Line 1:', address.address1 || '❌ MISSING');
          console.log('  Line 2:', address.address2 || '(not set)');
          console.log('  City:   ', address.city || '❌ MISSING');
          console.log('  State:  ', address.state || '❌ MISSING');
          console.log('  Zip:    ', address.zip || '❌ MISSING');
          console.log('  Country:', address.country || '❌ MISSING');
        } else {
          // Fallback to flat structure (old format)
          console.log('  Line 1:', (rewardStackParticipant as any).address1 || '❌ MISSING');
          console.log('  Line 2:', (rewardStackParticipant as any).address2 || '(not set)');
          console.log('  City:   ', (rewardStackParticipant as any).city || '❌ MISSING');
          console.log('  State:  ', (rewardStackParticipant as any).state || '❌ MISSING');
          console.log('  Zip:    ', (rewardStackParticipant as any).zip || '❌ MISSING');
          console.log('  Country:', (rewardStackParticipant as any).country || '❌ MISSING');
        }
        console.log('  Phone:  ', rewardStackParticipant.phone || '(not set)');

        // Check if RewardSTACK has the required fields (nested or flat)
        const rewardStackMissingFields: string[] = [];
        if (address && typeof address === 'object') {
          if (!address.address1) rewardStackMissingFields.push('Street Address');
          if (!address.city) rewardStackMissingFields.push('City');
          if (!address.state) rewardStackMissingFields.push('State');
          if (!address.zip) rewardStackMissingFields.push('Zip Code');
          if (!address.country) rewardStackMissingFields.push('Country');
        } else {
          if (!(rewardStackParticipant as any).address1) rewardStackMissingFields.push('Street Address');
          if (!(rewardStackParticipant as any).city) rewardStackMissingFields.push('City');
          if (!(rewardStackParticipant as any).state) rewardStackMissingFields.push('State');
          if (!(rewardStackParticipant as any).zip) rewardStackMissingFields.push('Zip Code');
          if (!(rewardStackParticipant as any).country) rewardStackMissingFields.push('Country');
        }

        if (rewardStackMissingFields.length > 0) {
          console.log('\n❌ REWARDSTACK MISSING FIELDS:', rewardStackMissingFields.join(', '));
          console.log('⚠️  This explains why the catalog transaction is failing!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          throw new Error(
            `Participant in RewardSTACK is missing required address fields: ${rewardStackMissingFields.join(', ')}. The participant needs to be re-synced.`
          );
        } else {
          console.log('\n✅ RewardSTACK has all required address fields');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }
      } else {
        console.log('⚠️  Could not fetch participant from RewardSTACK');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
      } catch (error: any) {
        console.log('⚠️  Error fetching participant from RewardSTACK:', error.message);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    }

    // Update status to PROCESSING
    await updateRewardIssuance(rewardIssuanceId, {
      status: "PENDING",
      rewardStackStatus: "PROCESSING",
    });

    // Prepare transaction request (per RewardSTACK API v2 docs)
    // Note: Use "shipping" property (not "shipping_address") per API spec
    // Note: issue_points: true automatically gives participant enough points for the reward
    const countryCode = getCountryCode(participant.country);
    const transactionRequest = {
      products: [
        {
          sku: rewardIssuance.skuId,
          quantity: 1,
        },
      ],
      shipping: {
        firstname: participant.firstName || '',
        lastname: participant.lastName || '',
        address1: participant.addressLine1 || '',
        address2: participant.addressLine2 || '',
        city: participant.city || '',
        state: participant.state || '',
        zip: participant.zipCode || '',
        country: countryCode || participant.country || '',
      },
      issue_points: true,
      metadata: {
        ...(rewardIssuance.metadata as Record<string, unknown>),
        changemaker_reward_id: rewardIssuanceId,
        changemaker_challenge_id: rewardIssuance.challengeId,
      },
    };

    console.log('📤 Sending catalog transaction to RewardSTACK:');
    console.log('  SKU:', rewardIssuance.skuId);
    console.log('  Quantity: 1');
    console.log('  Participant ID:', uniqueId);
    console.log('  Program ID:', programId);
    console.log('  Auto-issue points: true');
    console.log('  Shipping Address:');
    console.log('    Name:', transactionRequest.shipping.firstname, transactionRequest.shipping.lastname);
    console.log('    Address:', transactionRequest.shipping.address1);
    console.log('    City/State/Zip:', `${transactionRequest.shipping.city}, ${transactionRequest.shipping.state} ${transactionRequest.shipping.zip}`);
    console.log('    Country:', transactionRequest.shipping.country);

    // Call RewardSTACK API with retry
    const result = await executeWithRetry(async () => {
      const token = await generateRewardStackToken(
        rewardIssuance.workspaceId
      );
      const baseUrl = await getRewardStackBaseUrl(
        rewardIssuance.workspaceId
      );

      const url = `${baseUrl}/api/program/${encodeURIComponent(programId)}/participant/${encodeURIComponent(uniqueId)}/transaction`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionRequest),
      });

      console.log('\n📡 RewardSTACK API Response:', response.status, response.statusText);

      // Handle error responses
      if (!response.ok) {
        const errorData: RewardStackError = await response
          .json()
          .catch(() => ({ message: `HTTP ${response.status}` }));

        // Format error message (handle both string and array)
        const formatErrorMessage = (msg: unknown): string => {
          if (Array.isArray(msg)) {
            return msg.join('; ');
          }
          if (typeof msg === 'string') {
            return msg;
          }
          return 'Validation failed';
        };

        console.log('\n❌ RewardSTACK API Error:');
        console.log('  Status:', response.status, response.statusText);
        console.log('  Error Message:', formatErrorMessage(errorData.message));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Classify errors
        if (response.status === 400) {
          throw new Error(
            `Invalid transaction request: ${formatErrorMessage(errorData.message)}`
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
            `Participant or SKU not found: ${errorData.message || uniqueId}`
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
      rewardStackTransactionId: String(transactionId), // Convert to string for Prisma
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
      details: { skuId: rewardIssuance.skuId, uniqueId },
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

/**
 * RewardSTACK adjustment/transaction status response
 */
interface RewardStackStatusResponse {
  id: string;
  status: string;
  participantId: string;
  amount?: number;
  skuId?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Get adjustment status from RewardSTACK
 * GET /api/program/{programId}/participant/{uniqueId}/adjustment/{adjustmentId}
 */
export async function getAdjustmentStatus(
  workspaceId: string,
  uniqueId: string,
  adjustmentId: string
): Promise<RewardStackStatusResponse> {
  const { programId } = await validateWorkspaceConfig(workspaceId);
  const token = await generateRewardStackToken(workspaceId);
  const baseUrl = await getRewardStackBaseUrl(workspaceId);

  const url = `${baseUrl}/api/program/${encodeURIComponent(programId)}/participant/${encodeURIComponent(uniqueId)}/adjustment/${encodeURIComponent(adjustmentId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData: RewardStackError = await response
      .json()
      .catch(() => ({ message: `HTTP ${response.status}` }));

    if (response.status === 404) {
      throw new Error(`Adjustment not found: ${adjustmentId}`);
    }

    throw new Error(
      `Failed to get adjustment status: ${errorData.message || `HTTP ${response.status}`}`
    );
  }

  return await response.json();
}

/**
 * Get transaction status from RewardSTACK
 * GET /api/program/{programId}/participant/{uniqueId}/transaction/{transactionId}
 */
export async function getTransactionStatus(
  workspaceId: string,
  uniqueId: string,
  transactionId: string
): Promise<RewardStackStatusResponse> {
  const { programId } = await validateWorkspaceConfig(workspaceId);
  const token = await generateRewardStackToken(workspaceId);
  const baseUrl = await getRewardStackBaseUrl(workspaceId);

  const url = `${baseUrl}/api/program/${encodeURIComponent(programId)}/participant/${encodeURIComponent(uniqueId)}/transaction/${encodeURIComponent(transactionId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData: RewardStackError = await response
      .json()
      .catch(() => ({ message: `HTTP ${response.status}` }));

    if (response.status === 404) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    throw new Error(
      `Failed to get transaction status: ${errorData.message || `HTTP ${response.status}`}`
    );
  }

  return await response.json();
}

/**
 * Map RewardSTACK status to local RewardStackStatus enum
 */
function mapRewardStackStatus(status: string): RewardStackStatus {
  const statusLower = status.toLowerCase();

  switch (statusLower) {
    case "pending":
      return "PENDING";
    case "processing":
      return "PROCESSING";
    case "completed":
    case "success":
    case "delivered":
      return "COMPLETED";
    case "failed":
    case "error":
      return "FAILED";
    case "returned":
    case "cancelled":
      return "RETURNED";
    default:
      console.warn(`Unknown RewardSTACK status: ${status}, defaulting to PROCESSING`);
      return "PROCESSING";
  }
}

/**
 * Check status of a single reward issuance
 * Queries RewardSTACK and updates local status
 */
export async function checkRewardIssuanceStatus(
  rewardIssuanceId: string
): Promise<{
  success: boolean;
  status?: RewardStackStatus;
  error?: string;
  updated?: boolean;
}> {
  try {
    // Get reward issuance
    const rewardIssuance = await prisma.rewardIssuance.findUnique({
      where: { id: rewardIssuanceId },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        type: true,
        rewardStackStatus: true,
        rewardStackTransactionId: true,
        rewardStackAdjustmentId: true,
        User: {
          select: {
            rewardStackParticipantId: true,
          },
        },
      },
    });

    if (!rewardIssuance) {
      return { success: false, error: "RewardIssuance not found" };
    }

    if (!rewardIssuance.User.rewardStackParticipantId) {
      return {
        success: false,
        error: "Participant not synced to RewardSTACK",
      };
    }

    // Get external ID based on reward type
    const externalId =
      rewardIssuance.type === "points"
        ? rewardIssuance.rewardStackAdjustmentId
        : rewardIssuance.rewardStackTransactionId;

    if (!externalId) {
      return {
        success: false,
        error: "No external transaction/adjustment ID found",
      };
    }

    // Query RewardSTACK for status
    let statusResponse: RewardStackStatusResponse;

    if (rewardIssuance.type === "points") {
      statusResponse = await getAdjustmentStatus(
        rewardIssuance.workspaceId,
        rewardIssuance.userId, // Use userId as uniqueId
        externalId
      );
    } else {
      statusResponse = await getTransactionStatus(
        rewardIssuance.workspaceId,
        rewardIssuance.userId, // Use userId as uniqueId
        externalId
      );
    }

    // Map status
    const newStatus = mapRewardStackStatus(statusResponse.status);

    // Check if status changed
    const statusChanged = newStatus !== rewardIssuance.rewardStackStatus;

    if (statusChanged) {
      // Update local status
      const updates: Parameters<typeof updateRewardIssuance>[1] = {
        rewardStackStatus: newStatus,
      };

      // Update local reward status based on RewardSTACK status
      if (newStatus === "COMPLETED") {
        updates.status = "ISSUED";
        updates.issuedAt = updates.issuedAt || new Date();
      } else if (newStatus === "FAILED") {
        updates.status = "FAILED";
        updates.rewardStackErrorMessage = statusResponse.error || "Transaction failed";
      }

      await updateRewardIssuance(rewardIssuanceId, updates);

      // Log status change
      await prisma.activityEvent.create({
        data: {
          type: "WORKSPACE_SETTINGS_UPDATED",
          metadata: {
            action: "rewardstack_status_updated",
            rewardIssuanceId,
            externalId,
            oldStatus: rewardIssuance.rewardStackStatus,
            newStatus,
            timestamp: new Date().toISOString(),
          },
          userId: rewardIssuance.userId,
          workspaceId: rewardIssuance.workspaceId,
        },
      });

      console.log(
        `Updated RewardIssuance ${rewardIssuanceId} status: ${rewardIssuance.rewardStackStatus} → ${newStatus}`
      );
    }

    return {
      success: true,
      status: newStatus,
      updated: statusChanged,
    };
  } catch (error) {
    console.error(
      `Failed to check reward issuance status ${rewardIssuanceId}:`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check status of multiple reward issuances in parallel
 */
export async function checkMultipleRewardStatuses(
  rewardIssuanceIds: string[],
  options: {
    concurrency?: number; // Max parallel checks, default: 10
  } = {}
): Promise<{
  checked: number;
  updated: number;
  failed: number;
  results: Array<{ id: string; success: boolean; updated?: boolean; error?: string }>;
}> {
  const concurrency = options.concurrency || 10;
  const results: Array<{ id: string; success: boolean; updated?: boolean; error?: string }> = [];
  let checked = 0;
  let updated = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < rewardIssuanceIds.length; i += concurrency) {
    const batch = rewardIssuanceIds.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (id) => {
        const result = await checkRewardIssuanceStatus(id);
        checked++;
        if (result.success && result.updated) updated++;
        if (!result.success) failed++;
        return { id, ...result };
      })
    );

    results.push(...batchResults);
  }

  return { checked, updated, failed, results };
}

/**
 * Retry a failed reward issuance
 */
export async function retryFailedRewardIssuance(
  rewardIssuanceId: string
): Promise<RewardIssuanceResult> {
  try {
    // Get reward issuance
    const rewardIssuance = await prisma.rewardIssuance.findUnique({
      where: { id: rewardIssuanceId },
      select: {
        id: true,
        status: true,
        rewardStackStatus: true,
        type: true,
      },
    });

    if (!rewardIssuance) {
      return {
        success: false,
        error: "RewardIssuance not found",
      };
    }

    // Only retry if status is FAILED
    if (rewardIssuance.status !== "FAILED") {
      return {
        success: false,
        error: `Cannot retry reward with status ${rewardIssuance.status}. Only FAILED rewards can be retried.`,
      };
    }

    // Reset status to PENDING to allow retry
    await updateRewardIssuance(rewardIssuanceId, {
      status: "PENDING",
      rewardStackStatus: "PENDING",
      rewardStackErrorMessage: undefined,
      rewardStackTransactionId: undefined,
      rewardStackAdjustmentId: undefined,
    });

    // Log retry attempt
    await prisma.activityEvent.create({
      data: {
        type: "WORKSPACE_SETTINGS_UPDATED",
        metadata: {
          action: "rewardstack_retry_initiated",
          rewardIssuanceId,
          timestamp: new Date().toISOString(),
        },
        workspaceId: rewardIssuance.id, // Will be populated from rewardIssuance
      },
    });

    // Retry the issuance
    return await issueRewardTransaction(rewardIssuanceId);
  } catch (error) {
    console.error(
      `Failed to retry reward issuance ${rewardIssuanceId}:`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Find and check status of all pending/processing reward issuances
 * Useful for background job to monitor ongoing transactions
 */
export async function monitorPendingRewards(
  workspaceId?: string
): Promise<{
  checked: number;
  updated: number;
  failed: number;
  details: string[];
}> {
  const details: string[] = [];

  // Find pending/processing rewards
  const pendingRewards = await prisma.rewardIssuance.findMany({
    where: {
      ...(workspaceId && { workspaceId }),
      rewardStackStatus: {
        in: ["PENDING", "PROCESSING"],
      },
      OR: [
        { rewardStackTransactionId: { not: null } },
        { rewardStackAdjustmentId: { not: null } },
      ],
    },
    select: {
      id: true,
    },
  });

  details.push(`Found ${pendingRewards.length} pending/processing rewards`);

  if (pendingRewards.length === 0) {
    return { checked: 0, updated: 0, failed: 0, details };
  }

  // Check status of all pending rewards
  const result = await checkMultipleRewardStatuses(
    pendingRewards.map((r) => r.id),
    { concurrency: 10 }
  );

  details.push(`Checked ${result.checked} rewards`);
  details.push(`Updated ${result.updated} statuses`);
  details.push(`Failed to check ${result.failed} rewards`);

  return {
    checked: result.checked,
    updated: result.updated,
    failed: result.failed,
    details,
  };
}

/**
 * Bulk retry failed reward issuances
 */
export async function retryFailedRewards(
  workspaceId?: string,
  options: {
    concurrency?: number; // Max parallel retries, default: 5
    limit?: number; // Max number of retries, default: 50
  } = {}
): Promise<{
  attempted: number;
  successful: number;
  failed: number;
  details: string[];
}> {
  const concurrency = options.concurrency || 5;
  const limit = options.limit || 50;
  const details: string[] = [];

  // Find failed rewards
  const failedRewards = await prisma.rewardIssuance.findMany({
    where: {
      ...(workspaceId && { workspaceId }),
      status: "FAILED",
    },
    select: {
      id: true,
    },
    take: limit,
    orderBy: {
      createdAt: "asc", // Oldest first
    },
  });

  details.push(`Found ${failedRewards.length} failed rewards`);

  if (failedRewards.length === 0) {
    return { attempted: 0, successful: 0, failed: 0, details };
  }

  let attempted = 0;
  let successful = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < failedRewards.length; i += concurrency) {
    const batch = failedRewards.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (reward) => {
        attempted++;
        const result = await retryFailedRewardIssuance(reward.id);
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
        return result;
      })
    );

    details.push(`Batch ${Math.floor(i / concurrency) + 1}: ${batchResults.filter(r => r.success).length}/${batch.length} successful`);
  }

  details.push(`Total: ${successful} successful, ${failed} failed out of ${attempted} attempted`);

  return { attempted, successful, failed, details };
}
