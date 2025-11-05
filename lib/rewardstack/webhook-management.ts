/**
 * RewardSTACK Webhook Management
 * Functions for creating, updating, and deleting webhooks via RewardSTACK Management API
 *
 * API Version: 2.2
 * Endpoints:
 * - GET /api/2.2/webhooks
 * - POST /api/2.2/webhooks
 * - GET /api/2.2/webhooks/{webhookId}
 * - PATCH /api/2.2/webhooks/{webhookId}
 * - DELETE /api/2.2/webhooks/{webhookId}
 */

import { generateRewardStackToken, getRewardStackBaseUrl } from "./auth";
import { prisma } from "../prisma";

/**
 * Webhook configuration for RewardSTACK
 */
export interface WebhookConfig {
  url: string;
  events: string[];
  description?: string;
  secret?: string;
  enabled?: boolean;
}

/**
 * RewardSTACK webhook response
 */
export interface RewardStackWebhook {
  id: string;
  url: string;
  events: string[];
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
  secret?: string;
}

/**
 * Webhook management result
 */
export interface WebhookManagementResult {
  success: boolean;
  webhook?: RewardStackWebhook;
  error?: string;
  details?: unknown;
}

/**
 * Get all webhooks for a workspace
 * GET /api/2.2/webhooks
 */
export async function listWebhooks(
  workspaceId: string
): Promise<WebhookManagementResult> {
  try {
    const token = await generateRewardStackToken(workspaceId);
    const baseUrl = await getRewardStackBaseUrl(workspaceId);

    const url = `${baseUrl}/api/2.2/webhooks`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(
        `Failed to list webhooks: ${errorData.message || `HTTP ${response.status}`}`
      );
    }

    const webhooks = await response.json();

    return {
      success: true,
      details: webhooks,
    };
  } catch (error) {
    console.error("Failed to list webhooks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get specific webhook by ID
 * GET /api/2.2/webhooks/{webhookId}
 */
export async function getWebhook(
  workspaceId: string,
  webhookId: string
): Promise<WebhookManagementResult> {
  try {
    const token = await generateRewardStackToken(workspaceId);
    const baseUrl = await getRewardStackBaseUrl(workspaceId);

    const url = `${baseUrl}/api/2.2/webhooks/${encodeURIComponent(webhookId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `HTTP ${response.status}` }));

      if (response.status === 404) {
        throw new Error(`Webhook not found: ${webhookId}`);
      }

      throw new Error(
        `Failed to get webhook: ${errorData.message || `HTTP ${response.status}`}`
      );
    }

    const webhook = await response.json();

    return {
      success: true,
      webhook,
    };
  } catch (error) {
    console.error(`Failed to get webhook ${webhookId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a new webhook
 * POST /api/2.2/webhooks
 */
export async function createWebhook(
  workspaceId: string,
  config: WebhookConfig
): Promise<WebhookManagementResult> {
  try {
    // Validate configuration
    if (!config.url) {
      throw new Error("Webhook URL is required");
    }

    if (!config.events || config.events.length === 0) {
      throw new Error("At least one event type is required");
    }

    const token = await generateRewardStackToken(workspaceId);
    const baseUrl = await getRewardStackBaseUrl(workspaceId);

    const url = `${baseUrl}/api/2.2/webhooks`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: config.url,
        events: config.events,
        description: config.description,
        secret: config.secret,
        enabled: config.enabled !== undefined ? config.enabled : true,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `HTTP ${response.status}` }));

      if (response.status === 400) {
        throw new Error(
          `Invalid webhook configuration: ${errorData.message || "Validation failed"}`
        );
      }

      if (response.status === 409) {
        throw new Error(
          `Webhook already exists: ${errorData.message || "Duplicate webhook"}`
        );
      }

      throw new Error(
        `Failed to create webhook: ${errorData.message || `HTTP ${response.status}`}`
      );
    }

    const webhook = await response.json();

    // Store webhook ID in workspace for reference
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        rewardStackWebhookId: webhook.id,
        rewardStackWebhookSecret: config.secret || null,
      },
    });

    console.log(`Created webhook ${webhook.id} for workspace ${workspaceId}`);

    return {
      success: true,
      webhook,
    };
  } catch (error) {
    console.error("Failed to create webhook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update an existing webhook
 * PATCH /api/2.2/webhooks/{webhookId}
 */
export async function updateWebhook(
  workspaceId: string,
  webhookId: string,
  config: Partial<WebhookConfig>
): Promise<WebhookManagementResult> {
  try {
    const token = await generateRewardStackToken(workspaceId);
    const baseUrl = await getRewardStackBaseUrl(workspaceId);

    const url = `${baseUrl}/api/2.2/webhooks/${encodeURIComponent(webhookId)}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `HTTP ${response.status}` }));

      if (response.status === 404) {
        throw new Error(`Webhook not found: ${webhookId}`);
      }

      if (response.status === 400) {
        throw new Error(
          `Invalid webhook configuration: ${errorData.message || "Validation failed"}`
        );
      }

      throw new Error(
        `Failed to update webhook: ${errorData.message || `HTTP ${response.status}`}`
      );
    }

    const webhook = await response.json();

    // Update workspace webhook secret if changed
    if (config.secret) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          rewardStackWebhookSecret: config.secret,
        },
      });
    }

    console.log(`Updated webhook ${webhookId} for workspace ${workspaceId}`);

    return {
      success: true,
      webhook,
    };
  } catch (error) {
    console.error(`Failed to update webhook ${webhookId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a webhook
 * DELETE /api/2.2/webhooks/{webhookId}
 */
export async function deleteWebhook(
  workspaceId: string,
  webhookId: string
): Promise<WebhookManagementResult> {
  try {
    const token = await generateRewardStackToken(workspaceId);
    const baseUrl = await getRewardStackBaseUrl(workspaceId);

    const url = `${baseUrl}/api/2.2/webhooks/${encodeURIComponent(webhookId)}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `HTTP ${response.status}` }));

      if (response.status === 404) {
        throw new Error(`Webhook not found: ${webhookId}`);
      }

      throw new Error(
        `Failed to delete webhook: ${errorData.message || `HTTP ${response.status}`}`
      );
    }

    // Clear webhook ID from workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { rewardStackWebhookId: true },
    });

    if (workspace?.rewardStackWebhookId === webhookId) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          rewardStackWebhookId: null,
          rewardStackWebhookSecret: null,
        },
      });
    }

    console.log(`Deleted webhook ${webhookId} for workspace ${workspaceId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error(`Failed to delete webhook ${webhookId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Set up default webhook for a workspace
 * Creates a webhook configured for all relevant events
 */
export async function setupDefaultWebhook(
  workspaceId: string,
  webhookUrl: string
): Promise<WebhookManagementResult> {
  try {
    // Check if workspace already has a webhook
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { rewardStackWebhookId: true },
    });

    if (workspace?.rewardStackWebhookId) {
      console.log(
        `Workspace ${workspaceId} already has webhook ${workspace.rewardStackWebhookId}`
      );
      return await getWebhook(workspaceId, workspace.rewardStackWebhookId);
    }

    // Generate a secret for signature verification
    const secret = crypto.randomUUID();

    // Create webhook with all relevant events
    const config: WebhookConfig = {
      url: webhookUrl,
      events: [
        "transaction.created",
        "transaction.updated",
        "transaction.completed",
        "transaction.failed",
        "adjustment.created",
        "adjustment.updated",
        "adjustment.completed",
        "adjustment.failed",
        "participant.created",
        "participant.updated",
        "participant.deleted",
      ],
      description: `Changemaker webhook for workspace ${workspaceId}`,
      secret,
      enabled: true,
    };

    return await createWebhook(workspaceId, config);
  } catch (error) {
    console.error(`Failed to set up default webhook for workspace ${workspaceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
