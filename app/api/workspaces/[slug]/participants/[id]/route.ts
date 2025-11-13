import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { syncParticipantToRewardStack } from "@/lib/rewardstack/participant-sync";

type Params = Promise<{ slug: string; id: string }>;

/**
 * PATCH /api/workspaces/[slug]/participants/[id]
 * Update participant profile (address, phone, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { slug, id } = await params;
    const { workspace, user: currentUser } = await requireWorkspaceAccess(slug);

    const body = await request.json();

    // Check if user is updating their own profile or is an admin
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        userId: currentUser.dbUser.id,
        workspaceId: workspace.id,
      },
    });

    const isAdmin = membership?.role === "ADMIN";
    const isSelf = currentUser.dbUser.id === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: "Unauthorized to update this participant" },
        { status: 403 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        country: body.country,
        phone: body.phone,
        firstName: body.firstName,
        lastName: body.lastName,
        displayName: body.displayName,
        company: body.company,
        jobTitle: body.jobTitle,
        department: body.department,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        phone: true,
        rewardStackParticipantId: true,
        rewardStackSyncStatus: true,
      },
    });

    // If address was updated and user is synced to RewardSTACK, re-sync participant
    const addressUpdated =
      body.addressLine1 !== undefined ||
      body.addressLine2 !== undefined ||
      body.city !== undefined ||
      body.state !== undefined ||
      body.zipCode !== undefined ||
      body.country !== undefined;

    if (
      addressUpdated &&
      workspace.rewardStackEnabled &&
      updatedUser.rewardStackParticipantId
    ) {
      console.log(
        `[PATCH /participants/${id}] Address updated, re-syncing to RewardSTACK...`
      );

      // Re-sync participant to update address in RewardSTACK
      await syncParticipantToRewardStack(id, workspace.id);

      // Retry any failed SKU reward issuances for this user
      await retryFailedSkuRewards(id, workspace.id);
    }

    return NextResponse.json({
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Failed to update participant:", error);
    return NextResponse.json(
      {
        error: "Failed to update participant",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Retry failed SKU reward issuances for a user after address update
 */
async function retryFailedSkuRewards(
  userId: string,
  workspaceId: string
): Promise<void> {
  try {
    // Find failed SKU rewards for this user
    const failedRewards = await prisma.rewardIssuance.findMany({
      where: {
        userId,
        workspaceId,
        type: "sku",
        status: "FAILED",
        rewardStackStatus: "FAILED",
      },
      select: {
        id: true,
        rewardStackErrorMessage: true,
      },
    });

    if (failedRewards.length === 0) {
      return;
    }

    console.log(
      `[retryFailedSkuRewards] Found ${failedRewards.length} failed SKU rewards for user ${userId}`
    );

    // Only retry rewards that failed due to address validation
    const addressRelatedErrors = failedRewards.filter(
      (r) =>
        r.rewardStackErrorMessage?.toLowerCase().includes("address") ||
        r.rewardStackErrorMessage?.toLowerCase().includes("shipping") ||
        r.rewardStackErrorMessage?.toLowerCase().includes("state") ||
        r.rewardStackErrorMessage?.toLowerCase().includes("zip")
    );

    if (addressRelatedErrors.length === 0) {
      console.log(
        `[retryFailedSkuRewards] No address-related failures found, skipping retry`
      );
      return;
    }

    console.log(
      `[retryFailedSkuRewards] Retrying ${addressRelatedErrors.length} address-related failures...`
    );

    // Import dynamically to avoid circular dependency
    const { issueRewardTransaction } = await import(
      "@/lib/rewardstack/reward-logic"
    );

    // Retry each failed reward
    for (const reward of addressRelatedErrors) {
      // Reset status to PENDING to allow retry
      await prisma.rewardIssuance.update({
        where: { id: reward.id },
        data: {
          status: "PENDING",
          rewardStackStatus: "PENDING",
          rewardStackErrorMessage: null,
        },
      });

      // Retry the issuance (fire and forget - don't wait)
      issueRewardTransaction(reward.id).catch((err) => {
        console.error(
          `[retryFailedSkuRewards] Failed to retry reward ${reward.id}:`,
          err
        );
      });
    }

    console.log(
      `[retryFailedSkuRewards] Initiated retry for ${addressRelatedErrors.length} rewards`
    );
  } catch (error) {
    console.error("[retryFailedSkuRewards] Error:", error);
    // Don't throw - we don't want to fail the address update if retry fails
  }
}
