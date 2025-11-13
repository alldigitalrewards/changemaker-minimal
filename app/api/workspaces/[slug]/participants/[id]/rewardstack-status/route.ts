import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { getParticipantFromRewardStack } from "@/lib/rewardstack/participant-sync";

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

    let rewardStackAddress = null;

    // If synced, fetch participant data from RewardSTACK to get address
    if (isSynced && user.rewardStackParticipantId) {
      try {
        const participantData = await getParticipantFromRewardStack(
          workspace.id,
          programId,
          user.rewardStackParticipantId
        );

        if (participantData && participantData.address) {
          rewardStackAddress = participantData.address;
        }
      } catch (error) {
        console.error('Failed to fetch participant from RewardSTACK:', error);
        // Don't fail the whole request if this fails
      }
    }

    const response = {
      enabled: true,
      synced: isSynced,
      status: user.rewardStackSyncStatus,
      participantId: user.rewardStackParticipantId,
      lastSync: user.rewardStackLastSync,
      programId,
      rewardStackAddress,
      message: isSynced
        ? `Participant exists in program ${programId}`
        : `Participant will be created in program ${programId}`,
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 REWARDSTACK STATUS CHECK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Participant:', user.email);
    console.log('Name:', `${user.firstName || ''} ${user.lastName || ''}`.trim() || '(not set)');
    console.log('\nRewardSTACK Integration:');
    console.log('  Enabled:', response.enabled);
    console.log('  Synced:', response.synced ? '✅ YES' : '❌ NO');
    console.log('  Status:', response.status || 'NEVER_SYNCED');
    console.log('  Participant ID:', response.participantId || '(not yet synced)');
    console.log('  Program ID:', response.programId);
    console.log('  Last Sync:', response.lastSync ? new Date(response.lastSync).toLocaleString() : '(never)');
    console.log('\nMessage:', response.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json(response);
  }
);
