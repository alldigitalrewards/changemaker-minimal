/**
 * RewardSTACK Webhook Event Handlers
 * Extracted handlers for transaction, adjustment, and participant events
 * Enables retry logic and testing without circular dependencies
 */

import { prisma } from "@/lib/prisma";
import { RewardStatus, RewardStackStatus } from "@prisma/client";

/**
 * RewardSTACK webhook event structure
 */
export interface RewardStackWebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  data: {
    id: string;
    participantId?: string;
    programId?: string;
    status?: string;
    amount?: number;
    skuId?: string;
    metadata?: Record<string, unknown>;
    error?: string;
    [key: string]: unknown;
  };
}

/**
 * Handle transaction webhook events (transaction.*)
 */
export async function handleTransactionEvent(
  workspaceId: string,
  event: RewardStackWebhookEvent
): Promise<void> {
  const { data, type } = event;
  const transactionId = data.id;

  // Find RewardIssuance by transaction ID
  const rewardIssuance = await prisma.rewardIssuance.findFirst({
    where: {
      workspaceId,
      rewardStackTransactionId: transactionId,
    },
  });

  if (!rewardIssuance) {
    console.warn(
      `No RewardIssuance found for transaction ${transactionId} in workspace ${workspaceId}`
    );
    return;
  }

  // Map event type to status
  let newStatus: RewardStackStatus | null = null;
  let rewardStatus: RewardStatus | null = null;

  switch (type) {
    case "transaction.created":
      newStatus = RewardStackStatus.PROCESSING;
      break;
    case "transaction.updated":
      newStatus = (data.status as RewardStackStatus) || RewardStackStatus.PROCESSING;
      break;
    case "transaction.completed":
      newStatus = RewardStackStatus.COMPLETED;
      rewardStatus = RewardStatus.ISSUED;
      break;
    case "transaction.failed":
      newStatus = RewardStackStatus.FAILED;
      rewardStatus = RewardStatus.FAILED;
      break;
    default:
      console.warn(`Unknown transaction event type: ${type}`);
      return;
  }

  // Update RewardIssuance
  await prisma.rewardIssuance.update({
    where: { id: rewardIssuance.id },
    data: {
      rewardStackStatus: newStatus,
      rewardStackWebhookReceived: true,
      ...(rewardStatus && { status: rewardStatus }),
      ...(type === "transaction.completed" && !rewardIssuance.issuedAt && { issuedAt: new Date() }),
      ...(type === "transaction.failed" && data.error && { rewardStackErrorMessage: String(data.error) }),
    },
  });

  console.log(
    `Updated RewardIssuance ${rewardIssuance.id} from transaction event ${type}: ${newStatus}`
  );
}

/**
 * Handle adjustment webhook events (adjustment.*)
 */
export async function handleAdjustmentEvent(
  workspaceId: string,
  event: RewardStackWebhookEvent
): Promise<void> {
  const { data, type } = event;
  const adjustmentId = data.id;

  // Find RewardIssuance by adjustment ID
  const rewardIssuance = await prisma.rewardIssuance.findFirst({
    where: {
      workspaceId,
      rewardStackAdjustmentId: adjustmentId,
    },
  });

  if (!rewardIssuance) {
    console.warn(
      `No RewardIssuance found for adjustment ${adjustmentId} in workspace ${workspaceId}`
    );
    return;
  }

  // Map event type to status
  let newStatus: RewardStackStatus | null = null;
  let rewardStatus: RewardStatus | null = null;

  switch (type) {
    case "adjustment.created":
      newStatus = RewardStackStatus.PROCESSING;
      break;
    case "adjustment.updated":
      newStatus = (data.status as RewardStackStatus) || RewardStackStatus.PROCESSING;
      break;
    case "adjustment.completed":
      newStatus = RewardStackStatus.COMPLETED;
      rewardStatus = RewardStatus.ISSUED;
      break;
    case "adjustment.failed":
      newStatus = RewardStackStatus.FAILED;
      rewardStatus = RewardStatus.FAILED;
      break;
    default:
      console.warn(`Unknown adjustment event type: ${type}`);
      return;
  }

  // Update RewardIssuance
  await prisma.rewardIssuance.update({
    where: { id: rewardIssuance.id },
    data: {
      rewardStackStatus: newStatus,
      rewardStackWebhookReceived: true,
      ...(rewardStatus && { status: rewardStatus }),
      ...(type === "adjustment.completed" && !rewardIssuance.issuedAt && { issuedAt: new Date() }),
      ...(type === "adjustment.failed" && data.error && { rewardStackErrorMessage: String(data.error) }),
    },
  });

  console.log(
    `Updated RewardIssuance ${rewardIssuance.id} from adjustment event ${type}: ${newStatus}`
  );
}

/**
 * Handle participant webhook events (participant.*)
 */
export async function handleParticipantEvent(
  workspaceId: string,
  event: RewardStackWebhookEvent
): Promise<void> {
  const { data, type } = event;
  const participantId = data.id;

  // Find User by participant ID via WorkspaceMembership
  const membership = await prisma.workspaceMembership.findFirst({
    where: {
      workspaceId,
      User: {
        rewardStackParticipantId: participantId,
      },
    },
    include: {
      User: true,
    },
  });

  const user = membership?.User;

  if (!user) {
    console.warn(
      `No User found for participant ${participantId} in workspace ${workspaceId}`
    );
    return;
  }

  // Handle different participant events
  switch (type) {
    case "participant.created":
    case "participant.updated":
      // Participant was successfully created/updated in RewardSTACK
      await prisma.user.update({
        where: { id: user.id },
        data: {
          rewardStackSyncStatus: "SYNCED",
          rewardStackLastSync: new Date(),
        },
      });
      console.log(`Updated User ${user.id} sync status from event ${type}`);
      break;

    case "participant.deleted":
      // Participant was deleted from RewardSTACK
      await prisma.user.update({
        where: { id: user.id },
        data: {
          rewardStackSyncStatus: "NOT_SYNCED",
          rewardStackParticipantId: null,
        },
      });
      console.log(`Cleared participant ID for User ${user.id} from delete event`);
      break;

    default:
      console.warn(`Unknown participant event type: ${type}`);
  }
}
