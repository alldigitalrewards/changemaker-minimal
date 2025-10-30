import { NextRequest, NextResponse } from "next/server";
import {
  requireWorkspaceAdmin,
  withErrorHandling,
} from "@/lib/auth/api-auth";
import {
  removeManagerFromChallenge,
  DatabaseError,
  ResourceNotFoundError,
  WorkspaceAccessError,
} from "@/lib/db/queries";

/**
 * DELETE /api/workspaces/[slug]/challenges/[id]/managers/[managerId]
 * Remove a manager assignment from a challenge
 * Authorization: Workspace ADMIN only
 */
export const DELETE = withErrorHandling(
  async (
    _request: NextRequest,
    context: {
      params: Promise<{ slug: string; id: string; managerId: string }>;
    },
  ): Promise<NextResponse> => {
    const { slug, id: challengeId, managerId } = await context.params;

    // Verify admin authorization
    const { workspace } = await requireWorkspaceAdmin(slug);

    try {
      // Remove assignment using helper function from Task 10
      await removeManagerFromChallenge(challengeId, managerId, workspace.id);

      return NextResponse.json(
        {
          success: true,
          message: "Manager unassigned from challenge",
        },
        { status: 200 },
      );
    } catch (error) {
      // Helper function throws typed errors, re-throw for withErrorHandling
      if (
        error instanceof ResourceNotFoundError ||
        error instanceof WorkspaceAccessError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }

      // Unknown error
      console.error("Error removing manager from challenge:", error);
      throw new DatabaseError("Failed to remove manager from challenge");
    }
  },
);
