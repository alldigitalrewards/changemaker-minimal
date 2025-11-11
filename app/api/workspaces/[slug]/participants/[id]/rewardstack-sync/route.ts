import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { syncParticipantToRewardStack } from "@/lib/rewardstack/participant-sync";

type Params = Promise<{ slug: string; id: string }>;

/**
 * POST /api/workspaces/[slug]/participants/[id]/rewardstack-sync
 * Manually sync a participant to RewardSTACK
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug, id } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);

    // Check if RewardSTACK is enabled for this workspace
    if (!workspace.rewardStackEnabled) {
      return NextResponse.json(
        {
          error: "RewardSTACK integration is not enabled for this workspace",
        },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 MANUAL PARTICIPANT SYNC REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Participant:', user.email);
    console.log('Name:', `${user.firstName || ''} ${user.lastName || ''}`.trim() || '(not set)');
    console.log('Workspace:', workspace.slug);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      // Sync participant to RewardSTACK
      await syncParticipantToRewardStack(user.id, workspace.id);

      // Get updated sync status
      const updatedUser = await prisma.user.findUnique({
        where: { id },
        select: {
          rewardStackParticipantId: true,
          rewardStackSyncStatus: true,
          rewardStackLastSync: true,
        },
      });

      console.log('\n✅ Manual sync completed successfully');
      console.log('  Participant ID:', updatedUser?.rewardStackParticipantId || '(unknown)');
      console.log('  Status:', updatedUser?.rewardStackSyncStatus || 'UNKNOWN');
      console.log('  Last Sync:', updatedUser?.rewardStackLastSync ? new Date(updatedUser.rewardStackLastSync).toLocaleString() : '(unknown)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return NextResponse.json({
        success: true,
        participantId: updatedUser?.rewardStackParticipantId,
        status: updatedUser?.rewardStackSyncStatus,
        lastSync: updatedUser?.rewardStackLastSync,
      });
    } catch (error: any) {
      console.log('\n❌ Manual sync failed:', error.message);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return NextResponse.json(
        {
          error: "Failed to sync participant to RewardSTACK",
          details: error.message,
        },
        { status: 500 }
      );
    }
  }
);
