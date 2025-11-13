import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth";
import { syncParticipant } from "@/lib/rewardstack/service";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

/**
 * POST /api/workspaces/[slug]/rewardstack/sync-participants
 * Sync all workspace members to RewardSTACK as participants
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);

    if (!workspace.rewardStackEnabled) {
      return NextResponse.json(
        { error: "RewardSTACK is not enabled for this workspace" },
        { status: 400 }
      );
    }

    try {
      // Get all workspace members
      const members = await prisma.user.findMany({
        where: {
          WorkspaceMembership: {
            some: {
              workspaceId: workspace.id,
            },
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!members || members.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No members found in workspace",
          synced: 0,
          failed: 0,
          total: 0,
        });
      }

      let syncedCount = 0;
      let failedCount = 0;
      const errors: Array<{ userId: string; email: string; error: string }> = [];

      // Sync each member to RewardSTACK
      for (const member of members) {
        try {
          await syncParticipant(workspace.id, {
            uniqueId: member.id,
            email: member.email,
            firstName: member.firstName || undefined,
            lastName: member.lastName || undefined,
          });
          syncedCount++;
        } catch (error: any) {
          console.error(`Failed to sync participant ${member.email}:`, error);
          failedCount++;
          errors.push({
            userId: member.id,
            email: member.email,
            error: error.message || "Unknown error",
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${syncedCount} participants to RewardSTACK${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
        synced: syncedCount,
        failed: failedCount,
        total: members.length,
        errors: failedCount > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Error syncing participants to RewardSTACK:", error);
      return NextResponse.json(
        {
          error: "Failed to sync participants to RewardSTACK",
          details: error.message,
        },
        { status: 500 }
      );
    }
  }
);
