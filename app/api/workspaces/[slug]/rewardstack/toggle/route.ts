import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

/**
 * POST /api/workspaces/[slug]/rewardstack/toggle
 * Toggle RewardSTACK integration for workspace
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);
    const body = await request.json();

    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid enabled value" },
        { status: 400 }
      );
    }

    // Update workspace
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        rewardStackEnabled: enabled,
      },
    });

    return NextResponse.json({
      success: true,
      message: enabled
        ? "RewardSTACK integration enabled"
        : "RewardSTACK integration disabled",
    });
  }
);
