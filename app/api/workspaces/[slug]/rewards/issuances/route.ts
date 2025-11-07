import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

/**
 * GET /api/workspaces/[slug]/rewards/issuances
 * Get recent reward issuances for a workspace
 * Used to display issuance history to workspace admins
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const issuances = await prisma.rewardIssuance.findMany({
      where: {
        workspaceId: workspace.id,
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
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(limit, 100), // Cap at 100
    });

    return NextResponse.json({ issuances });
  }
);
