import { NextRequest, NextResponse } from "next/server";
import {
  requireManagerOrAdmin,
  withErrorHandling,
} from "@/lib/auth/api-auth";
import { DatabaseError, ResourceNotFoundError } from "@/lib/db/queries";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/workspaces/[slug]/submissions/[id]
 * Get detailed information about a specific submission
 * Authorization: Workspace MANAGER (assigned to challenge) or ADMIN
 */
export const GET = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ slug: string; id: string }> },
  ): Promise<NextResponse> => {
    const { slug, id: submissionId } = await context.params;

    // Verify manager or admin authorization
    const { workspace, user } = await requireManagerOrAdmin(slug);

    try {
      // Fetch submission with all related data
      const submission = await prisma.activitySubmission.findFirst({
        where: {
          id: submissionId,
          Activity: {
            Challenge: {
              workspaceId: workspace.id,
            },
          },
        },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          Activity: {
            include: {
              Challenge: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  workspaceId: true,
                },
              },
              ActivityTemplate: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  description: true,
                  basePoints: true,
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new ResourceNotFoundError("Submission", submissionId);
      }

      // For managers (not admins), verify they are assigned to this challenge
      const membership = await prisma.workspaceMembership.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.dbUser.id,
            workspaceId: workspace.id,
          },
        },
      });

      if (membership?.role === "MANAGER") {
        // Check if manager is assigned to this challenge
        const assignment = await prisma.challengeAssignment.findFirst({
          where: {
            managerId: user.dbUser.id,
            challengeId: submission.Activity.challengeId,
            workspaceId: workspace.id,
          },
        });

        if (!assignment) {
          throw new ResourceNotFoundError("Submission", submissionId);
        }
      }

      // Admin can see all submissions, no additional check needed

      return NextResponse.json({ submission }, { status: 200 });
    } catch (error) {
      if (
        error instanceof ResourceNotFoundError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }

      console.error("Error fetching submission:", error);
      throw new DatabaseError("Failed to fetch submission");
    }
  }
);
