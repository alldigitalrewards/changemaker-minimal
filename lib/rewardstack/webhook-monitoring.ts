/**
 * RewardSTACK Webhook Monitoring and Error Handling
 * Provides monitoring, retry logic, and idempotency for webhook processing
 */

import { prisma } from "../prisma";

/**
 * Webhook monitoring result
 */
export interface WebhookMonitoringResult {
  success: boolean;
  unprocessedCount?: number;
  failedCount?: number;
  retryResults?: RetryResult[];
  error?: string;
}

/**
 * Retry result for failed webhooks
 */
export interface RetryResult {
  webhookLogId: string;
  eventType: string;
  success: boolean;
  error?: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  maxRequests: number; // Maximum requests per window
  windowMs: number; // Time window in milliseconds
}

/**
 * In-memory rate limiter using sliding window
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * Check if request is within rate limit
   */
  checkLimit(
    identifier: string,
    config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
  ): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or initialize request timestamps for this identifier
    let timestamps = this.requests.get(identifier) || [];

    // Remove timestamps outside current window
    timestamps = timestamps.filter((t) => t > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= config.maxRequests) {
      const oldestRequest = Math.min(...timestamps);
      const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Add current timestamp
    timestamps.push(now);
    this.requests.set(identifier, timestamps);

    return { allowed: true };
  }

  /**
   * Clear old entries to prevent memory leak
   */
  cleanup(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    const cutoff = now - maxAgeMs;

    for (const [identifier, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recent);
      }
    }
  }
}

// Global rate limiter instance
export const webhookRateLimiter = new RateLimiter();

// Cleanup every hour
setInterval(() => webhookRateLimiter.cleanup(), 3600000);

/**
 * Idempotency cache for webhook events
 */
class IdempotencyCache {
  private cache: Map<string, { timestamp: number; processed: boolean }> = new Map();
  private readonly ttlMs: number = 86400000; // 24 hours

  /**
   * Check if event was already processed
   */
  async isProcessed(eventId: string, workspaceId: string): Promise<boolean> {
    const key = `${workspaceId}:${eventId}`;

    // Check in-memory cache first
    const cached = this.cache.get(key);
    if (cached) {
      // Remove if expired
      if (Date.now() - cached.timestamp > this.ttlMs) {
        this.cache.delete(key);
      } else {
        return cached.processed;
      }
    }

    // Check database
    const existingLog = await prisma.rewardStackWebhookLog.findFirst({
      where: {
        workspaceId,
        payload: {
          path: ["id"],
          equals: eventId,
        },
        processed: true,
      },
      select: { id: true, createdAt: true },
    });

    if (existingLog) {
      // Cache the result
      this.cache.set(key, {
        timestamp: Date.now(),
        processed: true,
      });
      return true;
    }

    return false;
  }

  /**
   * Mark event as processed
   */
  markProcessed(eventId: string, workspaceId: string): void {
    const key = `${workspaceId}:${eventId}`;
    this.cache.set(key, {
      timestamp: Date.now(),
      processed: true,
    });
  }

  /**
   * Clear old entries to prevent memory leak
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}

// Global idempotency cache
export const webhookIdempotency = new IdempotencyCache();

// Cleanup every hour
setInterval(() => webhookIdempotency.cleanup(), 3600000);

/**
 * Get unprocessed webhook events for a workspace
 */
export async function getUnprocessedWebhooks(
  workspaceId: string,
  options: {
    limit?: number;
    olderThanMinutes?: number;
  } = {}
): Promise<WebhookMonitoringResult> {
  try {
    const { limit = 100, olderThanMinutes = 5 } = options;

    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const unprocessed = await prisma.rewardStackWebhookLog.findMany({
      where: {
        workspaceId,
        processed: false,
        createdAt: {
          lt: cutoffTime,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        error: true,
      },
    });

    return {
      success: true,
      unprocessedCount: unprocessed.length,
      failedCount: unprocessed.filter((w) => w.error !== null).length,
    };
  } catch (error) {
    console.error("Failed to get unprocessed webhooks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get failed webhook events for a workspace
 */
export async function getFailedWebhooks(
  workspaceId: string,
  options: {
    limit?: number;
    since?: Date;
  } = {}
): Promise<WebhookMonitoringResult> {
  try {
    const { limit = 100, since = new Date(Date.now() - 24 * 60 * 60 * 1000) } = options;

    const failed = await prisma.rewardStackWebhookLog.findMany({
      where: {
        workspaceId,
        processed: false,
        error: {
          not: null,
        },
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        error: true,
      },
    });

    return {
      success: true,
      failedCount: failed.length,
    };
  } catch (error) {
    console.error("Failed to get failed webhooks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Retry failed webhook processing
 * Re-processes events from RewardStackWebhookLog that failed
 */
export async function retryFailedWebhooks(
  workspaceId: string,
  options: {
    webhookLogIds?: string[];
    maxRetries?: number;
  } = {}
): Promise<WebhookMonitoringResult> {
  try {
    const { webhookLogIds, maxRetries = 10 } = options;

    // Get failed webhooks to retry
    const failedLogs = await prisma.rewardStackWebhookLog.findMany({
      where: {
        workspaceId,
        processed: false,
        error: {
          not: null,
        },
        ...(webhookLogIds && { id: { in: webhookLogIds } }),
      },
      orderBy: {
        createdAt: "asc",
      },
      take: maxRetries,
      select: {
        id: true,
        eventType: true,
        payload: true,
      },
    });

    const retryResults: RetryResult[] = [];

    // Import handlers dynamically to avoid circular dependency
    const { handleTransactionEvent } = await import("../api/webhooks/rewardstack-handlers");
    const { handleAdjustmentEvent } = await import("../api/webhooks/rewardstack-handlers");
    const { handleParticipantEvent } = await import("../api/webhooks/rewardstack-handlers");

    for (const log of failedLogs) {
      try {
        const event = log.payload as any;
        const eventCategory = log.eventType.split(".")[0];

        // Route to appropriate handler
        switch (eventCategory) {
          case "transaction":
            await handleTransactionEvent(workspaceId, event);
            break;
          case "adjustment":
            await handleAdjustmentEvent(workspaceId, event);
            break;
          case "participant":
            await handleParticipantEvent(workspaceId, event);
            break;
          default:
            throw new Error(`Unknown event type: ${log.eventType}`);
        }

        // Mark as processed
        await prisma.rewardStackWebhookLog.update({
          where: { id: log.id },
          data: {
            processed: true,
            processedAt: new Date(),
            error: null,
          },
        });

        retryResults.push({
          webhookLogId: log.id,
          eventType: log.eventType,
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Update error message
        await prisma.rewardStackWebhookLog.update({
          where: { id: log.id },
          data: {
            error: `Retry failed: ${errorMessage}`,
          },
        });

        retryResults.push({
          webhookLogId: log.id,
          eventType: log.eventType,
          success: false,
          error: errorMessage,
        });
      }
    }

    return {
      success: true,
      retryResults,
    };
  } catch (error) {
    console.error("Failed to retry webhooks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Webhook health check
 * Returns statistics about webhook processing for monitoring
 */
export async function getWebhookHealthStats(
  workspaceId: string,
  options: {
    since?: Date;
  } = {}
): Promise<{
  success: boolean;
  stats?: {
    total: number;
    processed: number;
    failed: number;
    pending: number;
    processingRate: number;
    avgProcessingTimeMs?: number;
  };
  error?: string;
}> {
  try {
    const { since = new Date(Date.now() - 24 * 60 * 60 * 1000) } = options;

    const [total, processed, failed, pending] = await Promise.all([
      prisma.rewardStackWebhookLog.count({
        where: { workspaceId, createdAt: { gte: since } },
      }),
      prisma.rewardStackWebhookLog.count({
        where: { workspaceId, processed: true, createdAt: { gte: since } },
      }),
      prisma.rewardStackWebhookLog.count({
        where: {
          workspaceId,
          processed: false,
          error: { not: null },
          createdAt: { gte: since },
        },
      }),
      prisma.rewardStackWebhookLog.count({
        where: {
          workspaceId,
          processed: false,
          error: null,
          createdAt: { gte: since },
        },
      }),
    ]);

    // Calculate processing rate
    const processingRate = total > 0 ? (processed / total) * 100 : 0;

    // Calculate average processing time (optional)
    const processedLogs = await prisma.rewardStackWebhookLog.findMany({
      where: {
        workspaceId,
        processed: true,
        processedAt: { not: null },
        createdAt: { gte: since },
      },
      select: {
        createdAt: true,
        processedAt: true,
      },
      take: 100,
    });

    let avgProcessingTimeMs: number | undefined;
    if (processedLogs.length > 0) {
      const totalProcessingTime = processedLogs.reduce((sum, log) => {
        if (log.processedAt) {
          return sum + (log.processedAt.getTime() - log.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgProcessingTimeMs = totalProcessingTime / processedLogs.length;
    }

    return {
      success: true,
      stats: {
        total,
        processed,
        failed,
        pending,
        processingRate,
        avgProcessingTimeMs,
      },
    };
  } catch (error) {
    console.error("Failed to get webhook health stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Cleanup old processed webhook logs
 * Removes successfully processed logs older than specified days
 */
export async function cleanupOldWebhookLogs(
  workspaceId: string,
  olderThanDays: number = 30
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.rewardStackWebhookLog.deleteMany({
      where: {
        workspaceId,
        processed: true,
        error: null,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(
      `Cleaned up ${result.count} processed webhook logs older than ${olderThanDays} days`
    );

    return {
      success: true,
      deletedCount: result.count,
    };
  } catch (error) {
    console.error("Failed to cleanup old webhook logs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
