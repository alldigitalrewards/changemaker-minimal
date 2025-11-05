import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import {
  handleTransactionEvent,
  handleAdjustmentEvent,
  handleParticipantEvent,
  type RewardStackWebhookEvent,
} from "@/lib/api/webhooks/rewardstack-handlers";
import {
  webhookRateLimiter,
  webhookIdempotency,
  type RateLimitConfig,
} from "@/lib/rewardstack/webhook-monitoring";

/**
 * RewardSTACK Webhook Handler
 * POST /api/webhooks/rewardstack?workspaceId={workspaceId}
 *
 * Processes webhook events from RewardSTACK and updates local reward status.
 * Supports event types:
 * - transaction.created, transaction.updated, transaction.completed, transaction.failed
 * - adjustment.created, adjustment.updated, adjustment.completed, adjustment.failed
 * - participant.created, participant.updated, participant.deleted
 *
 * Features:
 * - Webhook signature verification using HMAC-SHA256
 * - Rate limiting (100 requests per minute per workspace)
 * - Idempotency handling to prevent duplicate processing
 * - Comprehensive error handling and logging
 */

/**
 * Rate limit configuration for webhook endpoint
 */
const WEBHOOK_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100, // Max 100 requests per workspace
  windowMs: 60000, // Per minute
};

/**
 * Verify webhook signature using HMAC-SHA256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}

/**
 * Extract workspace ID from query parameters
 */
function getWorkspaceId(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get("workspaceId");
}

/**
 * Log webhook event to RewardStackWebhookLog table
 */
async function logWebhookEvent(
  workspaceId: string,
  event: RewardStackWebhookEvent,
  status: "received" | "processed" | "failed",
  errorMessage?: string
): Promise<string | null> {
  try {
    const webhookLog = await prisma.rewardStackWebhookLog.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        eventType: event.type,
        payload: event as any,
        processed: status === "processed",
        processedAt: status === "processed" ? new Date() : null,
        error: errorMessage || null,
      },
    });

    return webhookLog.id;
  } catch (error) {
    console.error("Failed to log webhook event:", error);
    // Don't throw - logging failure shouldn't block webhook processing
    return null;
  }
}

/**
 * Update webhook log status
 */
async function updateWebhookLog(
  webhookLogId: string,
  processed: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.rewardStackWebhookLog.update({
      where: { id: webhookLogId },
      data: {
        processed,
        processedAt: processed ? new Date() : null,
        error: errorMessage || null,
      },
    });
  } catch (error) {
    console.error("Failed to update webhook log:", error);
    // Don't throw - logging failure shouldn't block webhook processing
  }
}


/**
 * Route handler for POST requests
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract workspace ID from query params
    const workspaceId = getWorkspaceId(request);

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspaceId query parameter" },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateLimitResult = webhookRateLimiter.checkLimit(workspaceId, WEBHOOK_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      console.warn(
        `Rate limit exceeded for workspace ${workspaceId}, retry after ${rateLimitResult.retryAfter}s`
      );
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter),
          },
        }
      );
    }

    // Verify workspace exists and has RewardSTACK enabled
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        rewardStackEnabled: true,
        rewardStackWebhookSecret: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    if (!workspace.rewardStackEnabled) {
      return NextResponse.json(
        { error: "RewardSTACK integration not enabled for this workspace" },
        { status: 400 }
      );
    }

    // Get raw request body for signature verification
    const rawBody = await request.text();
    let event: RewardStackWebhookEvent;

    try {
      event = JSON.parse(rawBody);
    } catch (error) {
      console.error("Failed to parse webhook payload:", error);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Idempotency check - prevent duplicate processing
    const alreadyProcessed = await webhookIdempotency.isProcessed(event.id, workspaceId);
    if (alreadyProcessed) {
      console.log(`Event ${event.id} already processed for workspace ${workspaceId}, skipping`);
      return NextResponse.json({
        received: true,
        eventId: event.id,
        note: "Already processed (idempotent)",
      });
    }

    // Verify webhook signature if secret is configured
    if (workspace.rewardStackWebhookSecret) {
      const signature = request.headers.get("x-rewardstack-signature");

      if (!signature) {
        const webhookLogId = await logWebhookEvent(
          workspaceId,
          event,
          "failed",
          "Missing webhook signature"
        );
        return NextResponse.json(
          { error: "Missing webhook signature" },
          { status: 401 }
        );
      }

      const isValid = verifyWebhookSignature(
        rawBody,
        signature,
        workspace.rewardStackWebhookSecret
      );

      if (!isValid) {
        const webhookLogId = await logWebhookEvent(
          workspaceId,
          event,
          "failed",
          "Invalid webhook signature"
        );
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    // Log webhook received and get log ID
    const webhookLogId = await logWebhookEvent(workspaceId, event, "received");

    // Route to appropriate handler based on event type
    const eventCategory = event.type.split(".")[0];

    try {
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
          console.warn(`Unknown webhook event category: ${eventCategory}`);
          if (webhookLogId) {
            await updateWebhookLog(
              webhookLogId,
              false,
              `Unknown event type: ${event.type}`
            );
          }
          return NextResponse.json(
            { error: `Unsupported event type: ${event.type}` },
            { status: 400 }
          );
      }

      // Update webhook log with successful processing
      if (webhookLogId) {
        await updateWebhookLog(webhookLogId, true);
      }

      // Mark event as processed for idempotency
      webhookIdempotency.markProcessed(event.id, workspaceId);

      return NextResponse.json({ received: true, eventId: event.id });
    } catch (error) {
      console.error(`Failed to process webhook event ${event.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (webhookLogId) {
        await updateWebhookLog(webhookLogId, false, errorMessage);
      }

      throw error;
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
