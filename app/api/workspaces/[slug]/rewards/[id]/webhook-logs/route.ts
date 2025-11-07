import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/workspaces/[slug]/rewards/[id]/webhook-logs
 * Fetch webhook logs related to a specific reward issuance
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
): Promise<NextResponse> {
  try {
    const { slug, id } = await params;

    // Require admin access
    const context = await requireWorkspaceAdmin(slug);

    // First, get the reward issuance to verify it exists and belongs to this workspace
    const rewardIssuance = await prisma.rewardIssuance.findFirst({
      where: {
        id,
        workspaceId: context.workspace.id,
      },
      select: {
        id: true,
        rewardStackTransactionId: true,
        rewardStackAdjustmentId: true,
      },
    });

    if (!rewardIssuance) {
      return NextResponse.json(
        { error: "Reward issuance not found" },
        { status: 404 }
      );
    }

    // Fetch all webhook logs for this workspace that might relate to this reward
    // We need to search the payload for the transaction ID or adjustment ID
    const allLogs = await prisma.rewardStackWebhookLog.findMany({
      where: {
        workspaceId: context.workspace.id,
      },
      orderBy: {
        receivedAt: "desc",
      },
      take: 1000, // Limit to recent logs for performance
    });

    // Filter logs that relate to this specific reward issuance
    const relevantLogs = allLogs.filter((log) => {
      const payload = log.payload as any;

      // Check if the payload's data.id matches our transaction or adjustment ID
      if (payload?.data?.id) {
        if (
          rewardIssuance.rewardStackTransactionId === payload.data.id ||
          rewardIssuance.rewardStackAdjustmentId === payload.data.id
        ) {
          return true;
        }
      }

      return false;
    });

    return NextResponse.json({
      logs: relevantLogs,
      totalFound: relevantLogs.length,
    });
  } catch (error) {
    console.error("Failed to fetch webhook logs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch webhook logs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
