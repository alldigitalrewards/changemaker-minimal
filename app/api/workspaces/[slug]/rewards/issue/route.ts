import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { issuePoints, createTransaction } from "@/lib/rewardstack/service";

type Params = Promise<{ slug: string }>;

interface IssuePointsRequest {
  type: "points";
  userId: string;
  amount: number;
  description: string;
}

interface IssueSkuRequest {
  type: "sku";
  userId: string;
  skuId: string;
  description: string;
}

type IssueRewardRequest = IssuePointsRequest | IssueSkuRequest;

/**
 * POST /api/workspaces/[slug]/rewards/issue
 * Issue a reward (points or SKU) to a participant
 *
 * Supports two types of rewards:
 * 1. Points - Direct points credit via RewardSTACK API
 * 2. SKU - Physical/digital reward from workspace SKU catalog
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace, user } = await requireWorkspaceAdmin(slug);

    const body = (await request.json()) as IssueRewardRequest;
    const { type, userId, description } = body;

    // Validate required fields
    if (!type || !userId || !description) {
      return NextResponse.json(
        { error: "Missing required fields: type, userId, description" },
        { status: 400 }
      );
    }

    // Verify user is a member of this workspace
    const participant = await prisma.user.findFirst({
      where: {
        id: userId,
        WorkspaceMembership: {
          some: {
            workspaceId: workspace.id,
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "User is not a member of this workspace" },
        { status: 404 }
      );
    }

    try {
      if (type === "points") {
        const { amount } = body as IssuePointsRequest;

        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: "Points amount must be greater than 0" },
            { status: 400 }
          );
        }

        // Issue points via RewardSTACK API
        let rewardStackResponse;
        if (workspace.rewardStackEnabled) {
          try {
            rewardStackResponse = await issuePoints(
              workspace.id,
              userId,
              amount,
              description
            );
          } catch (error: any) {
            console.error("RewardSTACK API error:", error);
            return NextResponse.json(
              {
                error: "Failed to issue points via RewardSTACK",
                details: error.message,
              },
              { status: 500 }
            );
          }
        }

        // Record issuance in database
        const issuance = await prisma.rewardIssuance.create({
          data: {
            workspaceId: workspace.id,
            userId,
            amount,
            type: "points",
            description,
            status: "ISSUED",
            issuedBy: user.dbUser.id,
            rewardStackTransactionId: rewardStackResponse?.adjustmentId || null,
          },
          include: {
            User: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                displayName: true,
              },
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: `Successfully issued ${amount} points to ${participant.email}`,
          issuance,
          rewardStackResponse,
        });
      } else if (type === "sku") {
        const { skuId } = body as IssueSkuRequest;

        if (!skuId) {
          return NextResponse.json(
            { error: "SKU ID is required for SKU rewards" },
            { status: 400 }
          );
        }

        // Verify SKU is assigned to this workspace
        const workspaceSku = await prisma.workspaceSku.findFirst({
          where: {
            workspaceId: workspace.id,
            skuId,
            isActive: true,
          },
        });

        if (!workspaceSku) {
          return NextResponse.json(
            {
              error:
                "This SKU is not available for this workspace or is inactive",
            },
            { status: 400 }
          );
        }

        // Issue SKU via RewardSTACK API
        let rewardStackResponse;
        if (workspace.rewardStackEnabled) {
          try {
            rewardStackResponse = await createTransaction(
              workspace.id,
              userId,
              skuId,
              description
            );
          } catch (error: any) {
            console.error("RewardSTACK API error:", error);
            return NextResponse.json(
              {
                error: "Failed to issue SKU via RewardSTACK",
                details: error.message,
              },
              { status: 500 }
            );
          }
        }

        // Record SKU issuance in database
        const issuance = await prisma.rewardIssuance.create({
          data: {
            workspaceId: workspace.id,
            userId,
            amount: workspaceSku.value || 0,
            type: "sku",
            skuId,
            description,
            status: "ISSUED",
            issuedBy: user.dbUser.id,
            rewardStackTransactionId: rewardStackResponse?.transactionId || null,
          },
          include: {
            User: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                displayName: true,
              },
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: `Successfully issued ${workspaceSku.name} to ${participant.email}`,
          issuance,
          sku: workspaceSku,
          rewardStackResponse,
        });
      } else {
        return NextResponse.json(
          { error: "Invalid reward type. Must be 'points' or 'sku'" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error issuing reward:", error);
      throw error;
    }
  }
);
