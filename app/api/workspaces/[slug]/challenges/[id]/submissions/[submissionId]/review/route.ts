import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, requireAuth, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string; id: string; submissionId: string }>;

/**
 * POST /api/workspaces/[slug]/challenges/[id]/submissions/[submissionId]/review
 * Approve or reject a submission
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug, id: challengeId, submissionId } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);
    const user = await requireAuth();

    const body = await request.json();
    const { action, feedback: reviewNotes } = body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Get the submission
    const submission = await prisma.activitySubmission.findFirst({
      where: {
        id: submissionId,
        Activity: {
          challengeId,
          Challenge: {
            workspaceId: workspace.id,
          },
        },
      },
      include: {
        Activity: {
          include: {
            ActivityTemplate: true,
          },
        },
        User: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json(
        { error: "Submission has already been reviewed" },
        { status: 400 }
      );
    }

    // If approved, create reward issuance first
    let rewardIssuance = null;

    if (action === 'approve' && submission.Activity.ActivityTemplate) {
      const template = submission.Activity.ActivityTemplate as any;
      const rewardType = template.rewardType || 'points';
      const rewardConfig = template.rewardConfig || {};

      try {
        // Create the reward issuance
        rewardIssuance = await prisma.rewardIssuance.create({
          data: {
            userId: submission.userId,
            workspaceId: workspace.id,
            challengeId,
            type: rewardType,
            amount: rewardType === 'points'
              ? (rewardConfig.pointsAmount || template.basePoints || 0)
              : rewardType === 'sku'
              ? (rewardConfig.productValue || 0)
              : (rewardConfig.amount || 0),
            skuId: rewardType === 'sku' ? rewardConfig.skuId : null,
            provider: rewardType === 'sku' ? (rewardConfig.provider || 'RewardSTACK') : null,
            description: `Reward for completing activity: ${template.name}`,
            status: 'PENDING',
            issuedBy: user.dbUser.id,
            issuedAt: new Date(),
          },
        });

        console.log('✅ Created reward issuance:', rewardIssuance.id);
      } catch (error) {
        console.error('Failed to create reward issuance:', error);
        // Don't fail the whole request, just log the error
      }
    }

    // Update submission status and link to reward if created
    const updated = await prisma.activitySubmission.update({
      where: { id: submissionId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedBy: user.dbUser.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
        ...(rewardIssuance && { rewardIssuanceId: rewardIssuance.id, rewardIssued: true }),
      },
      include: {
        User: true,
        Activity: {
          include: {
            ActivityTemplate: true,
          },
        },
      },
    });

    return NextResponse.json({
      submission: updated,
      rewardIssuance,
      message: action === 'approve' ? 'Submission approved' : 'Submission rejected',
    });
  }
);
