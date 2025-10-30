import { NextRequest, NextResponse } from "next/server";
import {
  requireManagerOrAdmin,
  withErrorHandling,
} from "@/lib/auth/api-auth";
import { DatabaseError } from "@/lib/db/queries";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/lib/types";

/**
 * GET /api/workspaces/[slug]/manager/queue
 * Get submissions for challenges assigned to the current manager
 * Authorization: Workspace MANAGER or ADMIN
 * Query params:
 *   - status: Filter by submission status (PENDING, MANAGER_APPROVED, etc.)
 */
export const GET = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ slug: string }> },
  ): Promise<NextResponse> => {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") as SubmissionStatus | null;

    // Verify manager or admin authorization
    const { workspace, user } = await requireManagerOrAdmin(slug);

    try {
      // Get all challenges assigned to this manager
      const assignments = await prisma.challengeAssignment.findMany({
        where: {
          managerId: user.dbUser.id,
          workspaceId: workspace.id,
        },
        select: { challengeId: true },
      });

      const assignedChallengeIds = assignments.map((a) => a.challengeId);

      // If manager has no assignments, return empty array with workspaceId
      if (assignedChallengeIds.length === 0) {
        return NextResponse.json({ workspaceId: workspace.id, submissions: [] }, { status: 200 });
      }

      // Build query with optional status filter
      const whereClause: any = {
        Activity: {
          challengeId: { in: assignedChallengeIds },
        },
      };

      if (statusFilter) {
        whereClause.status = statusFilter;
      }

      // Get submissions for assigned challenges
      const submissions = await prisma.activitySubmission.findMany({
        where: whereClause,
        include: {
          User: {
            select: { id: true, email: true },
          },
          Activity: {
            include: {
              ActivityTemplate: {
                select: { id: true, name: true, type: true },
              },
              Challenge: {
                select: { id: true, title: true, workspaceId: true },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });

      return NextResponse.json({ workspaceId: workspace.id, submissions }, { status: 200 });
    } catch (error) {
      // Unknown error
      console.error("Error fetching manager queue:", error);
      throw new DatabaseError("Failed to fetch manager queue");
    }
  },
);
