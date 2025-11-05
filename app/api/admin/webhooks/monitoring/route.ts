import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/queries";
import { prisma } from "@/lib/prisma";
import {
  getUnprocessedWebhooks,
  getFailedWebhooks,
  retryFailedWebhooks,
  getWebhookHealthStats,
  cleanupOldWebhookLogs,
} from "@/lib/rewardstack/webhook-monitoring";

/**
 * Admin Webhook Monitoring API
 * GET /api/admin/webhooks/monitoring?workspaceId={uuid}&action={action}
 *
 * Actions:
 * - stats: Get webhook health statistics
 * - unprocessed: Get unprocessed webhooks
 * - failed: Get failed webhooks
 *
 * POST /api/admin/webhooks/monitoring?workspaceId={uuid}
 * Actions (in body):
 * - retry: Retry failed webhook processing
 * - cleanup: Clean up old processed webhooks
 */

/**
 * Verify workspace admin access
 */
async function verifyWorkspaceAdmin(workspaceId: string): Promise<{
  authorized: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: "Unauthorized" };
  }

  const dbUser = await getUserBySupabaseId(user.id);
  if (!dbUser) {
    return { authorized: false, error: "User not found" };
  }

  // Verify user is admin for this workspace via WorkspaceMembership
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: {
        userId: dbUser.id,
        workspaceId,
      },
    },
  });

  if (!membership) {
    return { authorized: false, error: "Workspace not found or access denied" };
  }

  if (membership.role !== "ADMIN") {
    return { authorized: false, error: "Admin access required" };
  }

  return { authorized: true };
}

/**
 * GET - Retrieve webhook monitoring data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId parameter" }, { status: 400 });
    }

    // Verify admin access
    const authResult = await verifyWorkspaceAdmin(workspaceId);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 403 });
    }

    const action = searchParams.get("action") || "stats";

    switch (action) {
      case "stats": {
        const result = await getWebhookHealthStats(workspaceId, {
          since: searchParams.get("since")
            ? new Date(searchParams.get("since")!)
            : undefined,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result.stats);
      }

      case "unprocessed": {
        const result = await getUnprocessedWebhooks(workspaceId, {
          limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
          olderThanMinutes: searchParams.get("olderThanMinutes")
            ? parseInt(searchParams.get("olderThanMinutes")!)
            : undefined,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
          unprocessedCount: result.unprocessedCount,
          failedCount: result.failedCount,
        });
      }

      case "failed": {
        const result = await getFailedWebhooks(workspaceId, {
          limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
          since: searchParams.get("since")
            ? new Date(searchParams.get("since")!)
            : undefined,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
          failedCount: result.failedCount,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Webhook monitoring GET error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Perform webhook management actions
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId parameter" }, { status: 400 });
    }

    // Verify admin access
    const authResult = await verifyWorkspaceAdmin(workspaceId);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 403 });
    }
    const body = await request.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: "Missing action in request body" }, { status: 400 });
    }

    switch (action) {
      case "retry": {
        const result = await retryFailedWebhooks(workspaceId, {
          webhookLogIds: body.webhookLogIds,
          maxRetries: body.maxRetries,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        const successCount = result.retryResults?.filter((r) => r.success).length || 0;
        const failedCount = result.retryResults?.filter((r) => !r.success).length || 0;

        return NextResponse.json({
          success: true,
          retried: result.retryResults?.length || 0,
          succeeded: successCount,
          failed: failedCount,
          results: result.retryResults,
        });
      }

      case "cleanup": {
        const olderThanDays = body.olderThanDays || 30;
        const result = await cleanupOldWebhookLogs(workspaceId, olderThanDays);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          deletedCount: result.deletedCount,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Webhook monitoring POST error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
