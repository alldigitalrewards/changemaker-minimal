/**
 * RewardSTACK Participant Sync Service
 * Handles syncing workspace users to RewardSTACK participants
 *
 * API Version: 2.2
 * Endpoints: /api/2.2/participants
 */

import { prisma } from "../prisma";
import { generateRewardStackToken, getRewardStackBaseUrl } from "./auth";
import { RewardStackSyncStatus } from "@prisma/client";

/**
 * RewardSTACK Participant data structure (API v2.2)
 */
interface RewardStackParticipant {
  unique_id?: string; // Participant ID (returned by API)
  email_address: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  program?: string; // Program unique ID (required for creation)
  external_id?: string; // Our user ID for reference
  meta?: Record<string, unknown>;
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
 * Sync result for a participant operation
 */
export interface ParticipantSyncResult {
  success: boolean;
  participantId?: string;
  error?: string;
  details?: unknown;
}

/**
 * Map Changemaker User to RewardSTACK Participant format
 *
 * @param user - Prisma User object
 * @returns RewardStackParticipant data structure
 */
export function mapUserToParticipant(
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    country?: string | null;
  }
): RewardStackParticipant {
  const participant: RewardStackParticipant = {
    email_address: user.email,
    external_id: user.id,
  };

  // Add optional fields if present
  if (user.firstName) participant.firstname = user.firstName;
  if (user.lastName) participant.lastname = user.lastName;
  if (user.phone) participant.phone = user.phone;

  // Add address fields if present
  if (user.addressLine1) participant.address1 = user.addressLine1;
  if (user.addressLine2) participant.address2 = user.addressLine2;
  if (user.city) participant.city = user.city;
  if (user.state) participant.state = user.state;
  if (user.zipCode) participant.zip = user.zipCode;
  if (user.country) participant.country = user.country;

  return participant;
}

/**
 * Create a new participant in RewardSTACK
 *
 * @param workspaceId - Workspace UUID
 * @param programId - RewardSTACK program ID
 * @param participant - Participant data
 * @returns Created participant data including ID
 * @throws Error for API failures
 */
export async function createParticipant(
  workspaceId: string,
  programId: string,
  participant: RewardStackParticipant
): Promise<{ id: string; data: RewardStackParticipant }> {
  const token = await generateRewardStackToken(workspaceId);
  const baseUrl = await getRewardStackBaseUrl(workspaceId);

  const url = `${baseUrl}/api/program/${encodeURIComponent(programId)}/participant`;

  // Add program ID to participant data
  const participantData = {
    ...participant,
    program: programId,
  };

  console.log('[createParticipant] Request details:', {
    url,
    programId,
    participantEmail: participantData.email_address,
    tokenPrefix: token.substring(0, 20) + '...'
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(participantData),
  });

  // Handle error responses
  if (!response.ok) {
    const errorData: RewardStackError = await response
      .json()
      .catch(() => ({ message: `HTTP ${response.status}` }));

    console.error('[createParticipant] API error:', {
      status: response.status,
      errorData,
      url
    });

    // Handle specific error cases
    if (response.status === 400) {
      throw new Error(
        `Invalid participant data: ${errorData.message || "Validation failed"}`
      );
    }

    if (response.status === 401) {
      throw new Error(`Authentication failed: ${errorData.message || "Invalid API key"}`);
    }

    if (response.status === 403) {
      throw new Error("Access forbidden: Insufficient permissions");
    }

    if (response.status === 409) {
      throw new Error(
        `Participant already exists: ${errorData.message || "Duplicate email"}`
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
      `Failed to create participant: ${errorData.message || `HTTP ${response.status}`}`
    );
  }

  const data = await response.json();

  console.log('\n✅ Participant Created in RewardSTACK:');
  console.log('  Unique ID:', data.unique_id);
  console.log('  Email:', data.email_address);
  console.log('  Name:', data.firstname || '(none)', data.lastname || '');
  console.log('  Phone:', data.phone || '(none)');
  console.log('  Address:');
  console.log('    Line 1:', data.address1 || '(none)');
  console.log('    Line 2:', data.address2 || '(none)');
  console.log('    City:', data.city || '(none)');
  console.log('    State:', data.state || '(none)');
  console.log('    Zip:', data.zip || '(none)');
  console.log('    Country:', data.country || '(none)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    id: data.unique_id,
    data: data,
  };
}

/**
 * Update an existing participant in RewardSTACK
 *
 * @param workspaceId - Workspace UUID
 * @param programId - RewardSTACK program ID
 * @param participantId - RewardSTACK participant ID
 * @param participant - Updated participant data
 * @returns Updated participant data
 * @throws Error for API failures
 */
export async function updateParticipant(
  workspaceId: string,
  programId: string,
  participantId: string,
  participant: Partial<RewardStackParticipant>
): Promise<RewardStackParticipant> {
  const token = await generateRewardStackToken(workspaceId);
  const baseUrl = await getRewardStackBaseUrl(workspaceId);

  const url = `${baseUrl}/api/program/${encodeURIComponent(programId)}/participant/${encodeURIComponent(participantId)}`;

  console.log('[updateParticipant] Request details:', {
    url,
    programId,
    participantId,
    participantEmail: participant.email_address,
    tokenPrefix: token.substring(0, 20) + '...'
  });

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(participant),
  });

  if (!response.ok) {
    const errorData: RewardStackError = await response
      .json()
      .catch(() => ({ message: `HTTP ${response.status}` }));

    console.error('[updateParticipant] API error:', {
      status: response.status,
      errorData,
      url
    });

    if (response.status === 400) {
      throw new Error(
        `Invalid participant data: ${errorData.message || "Validation failed"}`
      );
    }

    if (response.status === 401) {
      throw new Error(`Authentication failed: ${errorData.message || "Invalid API key"}`);
    }

    if (response.status === 404) {
      throw new Error(
        `Participant not found: ${participantId}`
      );
    }

    if (response.status >= 500) {
      throw new Error(
        `RewardSTACK server error: ${errorData.message || "Internal server error"}`
      );
    }

    throw new Error(
      `Failed to update participant: ${errorData.message || `HTTP ${response.status}`}`
    );
  }

  const data = await response.json();

  console.log('[updateParticipant] Response from RewardSTACK:', {
    unique_id: data.unique_id,
    email_address: data.email_address,
    firstname: data.firstname,
    lastname: data.lastname,
    phone: data.phone,
    address1: data.address1,
    address2: data.address2,
    city: data.city,
    state: data.state,
    zip: data.zip,
    country: data.country,
    fullResponse: data,
  });

  return data;
}

/**
 * Get participant details from RewardSTACK
 *
 * @param workspaceId - Workspace UUID
 * @param programId - RewardSTACK program ID
 * @param participantId - RewardSTACK participant ID
 * @returns Participant data
 * @throws Error for API failures
 */
export async function getParticipantFromRewardStack(
  workspaceId: string,
  programId: string,
  participantId: string
): Promise<RewardStackParticipant> {
  const token = await generateRewardStackToken(workspaceId);
  const baseUrl = await getRewardStackBaseUrl(workspaceId);

  const url = `${baseUrl}/api/program/${encodeURIComponent(programId)}/participant/${encodeURIComponent(participantId)}`;

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
      throw new Error(`Participant not found: ${participantId}`);
    }

    if (response.status >= 500) {
      throw new Error(
        `RewardSTACK server error: ${errorData.message || "Internal server error"}`
      );
    }

    throw new Error(
      `Failed to get participant: ${errorData.message || `HTTP ${response.status}`}`
    );
  }

  return await response.json();
}

/**
 * Delete a participant from RewardSTACK
 *
 * @param workspaceId - Workspace UUID
 * @param programId - RewardSTACK program ID
 * @param participantId - RewardSTACK participant ID
 * @throws Error for API failures
 */
export async function deleteParticipant(
  workspaceId: string,
  programId: string,
  participantId: string
): Promise<void> {
  const token = await generateRewardStackToken(workspaceId);
  const baseUrl = await getRewardStackBaseUrl(workspaceId);

  const url = `${baseUrl}/api/program/${encodeURIComponent(programId)}/participant/${encodeURIComponent(participantId)}`;

  const response = await fetch(url, {
    method: "DELETE",
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
      // Participant already deleted or doesn't exist - not an error
      return;
    }

    if (response.status >= 500) {
      throw new Error(
        `RewardSTACK server error: ${errorData.message || "Internal server error"}`
      );
    }

    throw new Error(
      `Failed to delete participant: ${errorData.message || `HTTP ${response.status}`}`
    );
  }
}

/**
 * Update user sync status in database
 *
 * @param userId - User UUID
 * @param status - New sync status
 * @param participantId - Optional RewardSTACK participant ID
 * @param error - Optional error message for FAILED status
 */
export async function updateUserSyncStatus(
  userId: string,
  status: RewardStackSyncStatus,
  participantId?: string,
  error?: string
): Promise<void> {
  const updateData: {
    rewardStackSyncStatus: RewardStackSyncStatus;
    rewardStackParticipantId?: string;
    rewardStackLastSync?: Date;
  } = {
    rewardStackSyncStatus: status,
  };

  // Update participant ID if provided
  if (participantId) {
    updateData.rewardStackParticipantId = participantId;
  }

  // Update last sync timestamp for successful sync
  if (status === "SYNCED") {
    updateData.rewardStackLastSync = new Date();
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  // TODO: Log sync event for audit trail when proper ActivityLogType is added
  // Activity logging temporarily disabled due to missing workspaceId and improper type
  // await prisma.activityEvent.create({
  //   data: {
  //     type: "WORKSPACE_SETTINGS_UPDATED",
  //     metadata: {
  //       action: "rewardstack_participant_sync",
  //       userId,
  //       status,
  //       participantId: participantId || null,
  //       error: error || null,
  //       timestamp: new Date().toISOString(),
  //     },
  //     userId,
  //     workspaceId, // Required field
  //   },
  // });
}

/**
 * Handle sync error and update user status
 *
 * @param userId - User UUID
 * @param error - Error object or message
 */
export async function handleSyncError(
  userId: string,
  error: unknown
): Promise<void> {
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  await updateUserSyncStatus(userId, "FAILED");

  console.error(`RewardSTACK sync failed for user ${userId}:`, errorMessage);
}

/**
 * Check if user needs sync based on status and last sync time
 *
 * @param user - User object with sync fields
 * @param forceSyncAgeMinutes - Optional: Force sync if last sync older than this (default: 60 minutes)
 * @returns true if user should be synced
 */
export function shouldSyncUser(
  user: {
    rewardStackSyncStatus: RewardStackSyncStatus;
    rewardStackLastSync: Date | null;
  },
  forceSyncAgeMinutes: number = 60
): boolean {
  // Always sync if not synced or failed
  if (
    user.rewardStackSyncStatus === "NOT_SYNCED" ||
    user.rewardStackSyncStatus === "FAILED"
  ) {
    return true;
  }

  // Don't sync if currently pending
  if (user.rewardStackSyncStatus === "PENDING") {
    return false;
  }

  // Force resync if last sync is too old
  if (user.rewardStackLastSync) {
    const ageMinutes =
      (Date.now() - user.rewardStackLastSync.getTime()) / (1000 * 60);
    if (ageMinutes > forceSyncAgeMinutes) {
      return true;
    }
  }

  return false;
}

/**
 * Sync a single participant to RewardSTACK
 * Primary orchestration function for participant sync
 *
 * @param userId - User UUID to sync
 * @param workspaceId - Workspace UUID
 * @returns Sync result with success status and details
 */
export async function syncParticipantToRewardStack(
  userId: string,
  workspaceId: string
): Promise<ParticipantSyncResult> {
  try {
    // Get user with all required fields
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        rewardStackParticipantId: true,
        rewardStackSyncStatus: true,
        rewardStackLastSync: true,
        WorkspaceMembership: {
          where: { workspaceId },
          select: { workspaceId: true },
        },
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Verify user belongs to workspace
    if (user.WorkspaceMembership.length === 0) {
      throw new Error(`User ${userId} is not a member of workspace ${workspaceId}`);
    }

    // Get workspace configuration
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        rewardStackEnabled: true,
        rewardStackProgramId: true,
      },
    });

    if (!workspace || !workspace.rewardStackEnabled) {
      throw new Error(
        `RewardSTACK is not enabled for workspace ${workspaceId}`
      );
    }

    if (!workspace.rewardStackProgramId) {
      throw new Error(
        `RewardSTACK program ID not configured for workspace ${workspaceId}`
      );
    }

    // Set status to PENDING
    await updateUserSyncStatus(userId, "PENDING");

    // Map user to participant format
    const participantData = mapUserToParticipant(user);

    // Log participant data from Changemaker
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 PARTICIPANT SYNC - Changemaker → RewardSTACK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Participant:', user.email);
    console.log('Action:', user.rewardStackParticipantId ? 'UPDATE' : 'CREATE');
    console.log('\nData from Changemaker DB:');
    console.log('  Name:', user.firstName || '(none)', user.lastName || '');
    console.log('  Phone:', user.phone || '(none)');
    console.log('  Address Line 1:', user.addressLine1 || '(none)');
    console.log('  Address Line 2:', user.addressLine2 || '(none)');
    console.log('  City:', user.city || '(none)');
    console.log('  State:', user.state || '(none)');
    console.log('  Zip:', user.zipCode || '(none)');
    console.log('  Country:', user.country || '(none)');
    console.log('\nSync Status:');
    console.log('  Current RewardSTACK ID:', user.rewardStackParticipantId || '(not yet synced)');
    console.log('  Sync Status:', user.rewardStackSyncStatus || 'NEVER_SYNCED');

    let participantId: string;
    let action: "created" | "updated";

    // Determine if create or update
    if (user.rewardStackParticipantId) {
      // Participant exists - update
      try {
        await updateParticipant(
          workspaceId,
          workspace.rewardStackProgramId,
          user.rewardStackParticipantId,
          participantData
        );
        participantId = user.rewardStackParticipantId;
        action = "updated";
      } catch (error) {
        // If participant not found or server error (stale ID), create new one
        if (
          error instanceof Error &&
          (error.message.includes("not found") ||
            error.message.includes("server error"))
        ) {
          console.log(
            `[syncParticipantToRewardStack] Update failed for ${user.email}, creating new participant...`
          );
          const result = await createParticipant(
            workspaceId,
            workspace.rewardStackProgramId,
            participantData
          );
          participantId = result.id;
          action = "created";
        } else {
          throw error;
        }
      }
    } else {
      // No participant ID - create new
      const result = await createParticipant(
        workspaceId,
        workspace.rewardStackProgramId,
        participantData
      );
      participantId = result.id;
      action = "created";
    }

    // Update status to SYNCED
    await updateUserSyncStatus(userId, "SYNCED", participantId);

    return {
      success: true,
      participantId,
      details: { action, email: user.email },
    };
  } catch (error) {
    // Handle error and update status
    await handleSyncError(userId, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: { userId },
    };
  }
}

/**
 * Unsync a participant from RewardSTACK (delete from external system)
 *
 * @param userId - User UUID to unsync
 * @param workspaceId - Workspace UUID
 * @returns Sync result
 */
export async function unsyncParticipant(
  userId: string,
  workspaceId: string
): Promise<ParticipantSyncResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        rewardStackParticipantId: true,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (!user.rewardStackParticipantId) {
      // User not synced - nothing to do
      await updateUserSyncStatus(userId, "NOT_SYNCED");
      return {
        success: true,
        details: { action: "already_unsynced", email: user.email },
      };
    }

    // Get workspace configuration
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        rewardStackProgramId: true,
      },
    });

    if (!workspace || !workspace.rewardStackProgramId) {
      throw new Error(
        `RewardSTACK program ID not configured for workspace ${workspaceId}`
      );
    }

    // Delete from RewardSTACK
    await deleteParticipant(
      workspaceId,
      workspace.rewardStackProgramId,
      user.rewardStackParticipantId
    );

    // Clear participant ID and set status to NOT_SYNCED
    await prisma.user.update({
      where: { id: userId },
      data: {
        rewardStackParticipantId: null,
        rewardStackSyncStatus: "NOT_SYNCED",
        rewardStackLastSync: null,
      },
    });

    return {
      success: true,
      details: { action: "deleted", email: user.email },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: { userId },
    };
  }
}

/**
 * Bulk sync summary
 */
export interface BulkSyncSummary {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: ParticipantSyncResult[];
}

/**
 * Bulk sync participants to RewardSTACK
 * Syncs multiple users with concurrency control and progress tracking
 *
 * @param userIds - Array of user UUIDs to sync
 * @param workspaceId - Workspace UUID
 * @param options - Sync options
 * @returns Bulk sync summary
 */
export async function bulkSyncParticipants(
  userIds: string[],
  workspaceId: string,
  options: {
    concurrency?: number; // Max parallel syncs (default: 5)
    forceResync?: boolean; // Force resync even if already synced (default: false)
  } = {}
): Promise<BulkSyncSummary> {
  const concurrency = options.concurrency || 5;
  const forceResync = options.forceResync || false;

  const summary: BulkSyncSummary = {
    total: userIds.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  // Filter users that need syncing (unless forceResync is true)
  let usersToSync = userIds;
  if (!forceResync) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        rewardStackSyncStatus: true,
        rewardStackLastSync: true,
      },
    });

    usersToSync = users
      .filter((user) => shouldSyncUser(user))
      .map((user) => user.id);

    summary.skipped = userIds.length - usersToSync.length;
  }

  // Process in batches with concurrency control
  const results: ParticipantSyncResult[] = [];
  for (let i = 0; i < usersToSync.length; i += concurrency) {
    const batch = usersToSync.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map((userId) =>
        syncParticipantToRewardStack(userId, workspaceId)
      )
    );

    results.push(...batchResults);

    // Update summary
    for (const result of batchResults) {
      if (result.success) {
        summary.successful++;
      } else {
        summary.failed++;
      }
    }
  }

  summary.results = results;
  return summary;
}

/**
 * Sync all workspace participants to RewardSTACK
 *
 * @param workspaceId - Workspace UUID
 * @param options - Sync options
 * @returns Bulk sync summary
 */
export async function syncAllWorkspaceParticipants(
  workspaceId: string,
  options: {
    concurrency?: number;
    forceResync?: boolean;
  } = {}
): Promise<BulkSyncSummary> {
  // Get all users in workspace
  const memberships = await prisma.workspaceMembership.findMany({
    where: { workspaceId },
    select: { userId: true },
  });

  const userIds = memberships.map((m) => m.userId);

  if (userIds.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };
  }

  return bulkSyncParticipants(userIds, workspaceId, options);
}
