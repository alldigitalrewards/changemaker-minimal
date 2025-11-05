import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { RewardStatus, RewardStackStatus } from "@prisma/client";
import { retryFailedRewardIssuance } from "@/lib/rewardstack/reward-logic";

/**
 * POST /api/workspaces/[slug]/rewards/retry
 * Admin endpoint to retry failed reward issuances
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const { slug } = await params;

    // Require admin access
    const context = await requireWorkspaceAdmin(slug);

    const body = await request.json();
    const { rewardIds } = body as { rewardIds: string[] };

    if (!rewardIds || !Array.isArray(rewardIds) || rewardIds.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid rewardIds array" },
        { status: 400 }
      );
    }

    // Fetch the reward issuances to retry
    const rewardsToRetry = await prisma.rewardIssuance.findMany({
      where: {
        id: { in: rewardIds },
        workspaceId: context.workspace.id,
        // Only allow retry of FAILED or PENDING rewards
        status: {
          in: [RewardStatus.FAILED, RewardStatus.PENDING],
        },
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            rewardStackParticipantId: true,
          },
        },
        Challenge: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (rewardsToRetry.length === 0) {
      return NextResponse.json(
        { error: "No eligible rewards found for retry" },
        { status: 404 }
      );
    }

    // Retry each reward issuance
    const results = await Promise.allSettled(
      rewardsToRetry.map(async (reward) => {
        try {
          // Use the existing retry function from reward-logic
          const result = await retryFailedRewardIssuance(reward.id);

          if (!result.success) {
            throw new Error(result.error || "Failed to retry reward issuance");
          }

          return {
            id: reward.id,
            success: true,
            message: "Reward retry initiated successfully",
          };
        } catch (error) {
          return {
            id: reward.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    // Process results
    const retryResults = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          id: rewardsToRetry[index].id,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
      }
    });

    const successCount = retryResults.filter((r) => r.success).length;
    const failedCount = retryResults.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      total: rewardsToRetry.length,
      succeeded: successCount,
      failed: failedCount,
      results: retryResults,
    });
  } catch (error) {
    console.error("Failed to retry rewards:", error);
    return NextResponse.json(
      {
        error: "Failed to retry rewards",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
