import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess, withErrorHandling } from "@/lib/auth/api-auth";
import { getCatalog } from "@/lib/rewardstack/service";

type Params = Promise<{ slug: string }>;

/**
 * GET /api/workspaces/[slug]/rewardstack/catalog
 * Fetch available catalog items from RewardSTACK for this workspace
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAccess(slug);

    // Check if RewardSTACK is enabled
    if (!workspace.rewardStackEnabled) {
      return NextResponse.json(
        {
          error: "RewardSTACK integration is not enabled for this workspace",
          enabled: false,
        },
        { status: 400 }
      );
    }

    try {
      const catalog = await getCatalog(workspace.id);

      return NextResponse.json({
        items: catalog.items,
        total: catalog.total,
        enabled: true,
      });
    } catch (error: any) {
      console.error("Failed to fetch RewardSTACK catalog:", error);
      return NextResponse.json(
        {
          error: error.message || "Failed to fetch catalog from RewardSTACK",
          items: [],
          total: 0,
        },
        { status: error.statusCode || 500 }
      );
    }
  }
);
