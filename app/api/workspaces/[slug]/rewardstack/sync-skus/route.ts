import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth";
import { getCatalog } from "@/lib/rewardstack/service";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

/**
 * POST /api/workspaces/[slug]/rewardstack/sync-skus
 * Fetch catalog from RewardSTACK and sync to workspace SKUs
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
      // Fetch catalog from RewardSTACK
      const catalog = await getCatalog(workspace.id);

      if (!catalog.items || catalog.items.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No SKUs found in RewardSTACK catalog",
          synced: 0,
          total: 0,
        });
      }

      // Sync SKUs to workspace
      let syncedCount = 0;
      let updatedCount = 0;

      for (const item of catalog.items) {
        const existing = await prisma.workspaceSku.findFirst({
          where: {
            workspaceId: workspace.id,
            skuId: item.sku,
          },
        });

        if (existing) {
          // Update existing SKU
          await prisma.workspaceSku.update({
            where: { id: existing.id },
            data: {
              name: item.name,
              description: item.description,
              value: item.value,
              isActive: item.isActive,
            },
          });
          updatedCount++;
        } else {
          // Create new SKU
          await prisma.workspaceSku.create({
            data: {
              workspaceId: workspace.id,
              skuId: item.sku,
              name: item.name,
              description: item.description,
              value: item.value,
              isActive: item.isActive,
              isDefault: false, // Don't auto-select as default
            },
          });
          syncedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${syncedCount} new SKUs and updated ${updatedCount} existing SKUs from RewardSTACK catalog`,
        synced: syncedCount,
        updated: updatedCount,
        total: catalog.items.length,
      });
    } catch (error: any) {
      console.error("Error syncing SKUs from RewardSTACK:", error);
      return NextResponse.json(
        {
          error: "Failed to sync SKUs from RewardSTACK",
          details: error.message,
        },
        { status: 500 }
      );
    }
  }
);
