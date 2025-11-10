import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string; id: string }>;

/**
 * GET /api/workspaces/[slug]/participants/[id]/rewardstack-status
 * Check if a participant exists in RewardSTACK
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug, id } = await params;
    const { workspace } = await requireWorkspaceAccess(slug);

    // Check if RewardSTACK is enabled for this workspace
    if (!workspace.rewardStackEnabled) {
      return NextResponse.json({
        enabled: false,
        message: "RewardSTACK integration is not enabled for this workspace",
      });
    }

    // Get program ID
    const programId = workspace.rewardStackProgramId || process.env.REWARDSTACK_PROGRAM_ID;
    if (!programId) {
      return NextResponse.json({
        enabled: true,
        synced: false,
        message: "RewardSTACK program ID not configured",
      });
    }

    // Get user and check sync status
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        rewardStackParticipantId: true,
        rewardStackSyncStatus: true,
        rewardStackLastSync: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if participant is synced
    const isSynced =
      user.rewardStackSyncStatus === "SYNCED" &&
      user.rewardStackParticipantId !== null;

    return NextResponse.json({
      enabled: true,
      synced: isSynced,
      status: user.rewardStackSyncStatus,
      participantId: user.rewardStackParticipantId,
      lastSync: user.rewardStackLastSync,
      programId,
      message: isSynced
        ? `Participant exists in program ${programId}`
        : `Participant will be created in program ${programId}`,
    });
  }
);
