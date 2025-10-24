import { NextRequest, NextResponse } from "next/server";
import {
  requireWorkspaceAdmin,
  withErrorHandling,
} from "@/lib/auth/api-auth";
import {
  assignManagerToChallenge,
  DatabaseError,
  ResourceNotFoundError,
  WorkspaceAccessError,
} from "@/lib/db/queries";

/**
 * POST /api/workspaces/[slug]/challenges/[id]/managers
 * Assign a manager to a challenge
 * Authorization: Workspace ADMIN only
 */
export const POST = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ slug: string; id: string }> },
  ): Promise<NextResponse> => {
    const { slug, id: challengeId } = await context.params;

    // Verify admin authorization
    const { workspace, user } = await requireWorkspaceAdmin(slug);

    // Parse request body
    const body = await request.json();
    const { managerId } = body;

    if (!managerId || typeof managerId !== "string") {
      return NextResponse.json(
        { error: "managerId is required and must be a string" },
        { status: 400 },
      );
    }

    try {
      // Create assignment using helper function from Task 10
      const assignment = await assignManagerToChallenge({
        challengeId,
        managerId,
        assignedBy: user.dbUser.id,
        workspaceId: workspace.id,
      });

      return NextResponse.json({ assignment }, { status: 201 });
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
      console.error("Error assigning manager to challenge:", error);
      throw new DatabaseError("Failed to assign manager to challenge");
    }
  },
);
