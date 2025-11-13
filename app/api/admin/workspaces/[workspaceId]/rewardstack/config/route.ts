import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, withErrorHandling } from "@/lib/auth/api-auth";

type Params = Promise<{ workspaceId: string }>;

/**
 * POST /api/admin/workspaces/[workspaceId]/rewardstack/config
 * Save RewardSTACK configuration for workspace
 * Platform Admin only
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    await requirePlatformAdmin();
    const { workspaceId } = await params;
    const body = await request.json();

    const { programId, orgId } = body;

    // Update workspace with new RewardSTACK configuration
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        rewardStackProgramId: programId || null,
        rewardStackOrgId: orgId || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "RewardSTACK configuration saved successfully",
      workspace: {
        id: workspace.id,
        rewardStackProgramId: workspace.rewardStackProgramId,
        rewardStackOrgId: workspace.rewardStackOrgId,
      },
    });
  }
);
