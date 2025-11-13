import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string; id: string }>;

/**
 * GET /api/workspaces/[slug]/challenges/[id]/submissions
 * Get all submissions for a challenge with optional status filtering
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug, id: challengeId } = await params;
    const { workspace } = await requireWorkspaceAccess(slug);

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const statusFilter = statusParam ? statusParam.toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED' : undefined;

    const submissions = await prisma.activitySubmission.findMany({
      where: {
        Activity: {
          challengeId,
          Challenge: {
            workspaceId: workspace.id,
          },
        },
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
        Activity: {
          include: {
            ActivityTemplate: {
              select: {
                name: true,
                type: true,
                basePoints: true,
              },
            },
          },
        },
        RewardIssuance: {
          select: {
            id: true,
            status: true,
            amount: true,
            rewardStackStatus: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // Calculate summary
    const summary = {
      total: submissions.length,
      pending: submissions.filter((s) => s.status === 'PENDING').length,
      approved: submissions.filter((s) => s.status === 'APPROVED').length,
      rejected: submissions.filter((s) => s.status === 'REJECTED').length,
    };

    return NextResponse.json({ submissions, summary });
  }
);
