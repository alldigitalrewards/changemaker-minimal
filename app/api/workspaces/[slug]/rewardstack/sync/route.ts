import { NextRequest, NextResponse } from "next/server";
import {
  requireWorkspaceAdmin,
  withErrorHandling,
} from "@/lib/auth/api-auth";
import {
  syncParticipantToRewardStack,
  bulkSyncParticipants,
  syncAllWorkspaceParticipants,
} from "@/lib/rewardstack/participant-sync";

type Params = Promise<{ slug: string }>;

interface SyncRequest {
  userId?: string; // Single user sync
  userIds?: string[]; // Bulk user sync
  syncAll?: boolean; // Sync all workspace participants
  forceResync?: boolean; // Force resync even if already synced
}

/**
 * POST /api/workspaces/[slug]/rewardstack/sync
 * Manually trigger participant sync to RewardSTACK
 *
 * Supports:
 * - Single user sync: { userId: "uuid" }
 * - Bulk user sync: { userIds: ["uuid1", "uuid2"] }
 * - All workspace sync: { syncAll: true }
 *
 * Requires admin authentication
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);

    // Verify RewardSTACK is enabled
    if (!workspace.rewardStackEnabled) {
      return NextResponse.json(
        {
          error: "RewardSTACK integration is not enabled for this workspace",
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = (await request.json()) as SyncRequest;
    const { userId, userIds, syncAll, forceResync } = body;

    // Validate request
    if (!userId && !userIds && !syncAll) {
      return NextResponse.json(
        {
          error: "Must provide userId, userIds, or syncAll",
        },
        { status: 400 }
      );
    }

    try {
      // Single user sync
      if (userId) {
        const result = await syncParticipantToRewardStack(
          userId,
          workspace.id
        );

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: result.error,
              details: result.details,
            },
            { status: 200 } // Return 200 for graceful client handling
          );
        }

        return NextResponse.json({
          success: true,
          message: "Participant synced successfully",
          participantId: result.participantId,
          details: result.details,
        });
      }

      // Bulk user sync
      if (userIds && Array.isArray(userIds)) {
        const summary = await bulkSyncParticipants(userIds, workspace.id, {
          forceResync,
        });

        return NextResponse.json({
          success: true,
          message: `Synced ${summary.successful} of ${summary.total} participants`,
          summary,
        });
      }

      // Sync all workspace participants
      if (syncAll) {
        const summary = await syncAllWorkspaceParticipants(workspace.id, {
          forceResync,
        });

        return NextResponse.json({
          success: true,
          message: `Synced ${summary.successful} of ${summary.total} participants`,
          summary,
        });
      }

      // Should never reach here due to validation above
      return NextResponse.json(
        {
          error: "Invalid request parameters",
        },
        { status: 400 }
      );
    } catch (error) {
      console.error("RewardSTACK sync error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to sync participants",
          details:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
        { status: 500 }
      );
    }
  }
);
