import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { RewardStatus, RewardStackStatus } from "@prisma/client";

/**
 * GET /api/workspaces/[slug]/rewards
 * Admin endpoint to fetch reward issuances with filters and pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const { slug } = await params;

    // Require admin access
    const context = await requireWorkspaceAdmin(slug);

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status") as RewardStatus | null;
    const rewardStackStatus = searchParams.get("rewardStackStatus") as RewardStackStatus | null;
    const userId = searchParams.get("userId");
    const challengeId = searchParams.get("challengeId");
    const hasError = searchParams.get("hasError");
    const search = searchParams.get("search"); // Search by user email/name

    // Build where clause
    const where: any = {
      workspaceId: context.workspace.id,
    };

    if (status) {
      where.status = status;
    }

    if (rewardStackStatus) {
      where.rewardStackStatus = rewardStackStatus;
    }

    if (userId) {
      where.userId = userId;
    }

    if (challengeId) {
      where.challengeId = challengeId;
    }

    if (hasError === "true") {
      where.rewardStackErrorMessage = { not: null };
    }

    if (search) {
      where.User = {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Fetch rewards with pagination
    const [rewards, total] = await Promise.all([
      prisma.rewardIssuance.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              displayName: true,
              rewardStackParticipantId: true,
            },
          },
          Challenge: {
            select: {
              id: true,
              title: true,
            },
          },
          IssuedByUser: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
      }),
      prisma.rewardIssuance.count({ where }),
    ]);

    // Calculate summary statistics
    const stats = await prisma.rewardIssuance.groupBy({
      by: ["status"],
      where: {
        workspaceId: context.workspace.id,
      },
      _count: true,
      _sum: {
        amount: true,
      },
    });

    const summary = {
      totalCount: total,
      byStatus: stats.map((s) => ({
        status: s.status,
        count: s._count,
        totalAmount: s._sum.amount || 0,
      })),
    };

    return NextResponse.json({
      rewards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    console.error("Failed to fetch rewards:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch rewards",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
