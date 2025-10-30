import { NextRequest, NextResponse } from "next/server";
import {
  requireManagerOrAdmin,
  withErrorHandling,
} from "@/lib/auth/api-auth";
import {
  managerReviewSubmission,
  DatabaseError,
  ResourceNotFoundError,
} from "@/lib/db/queries";

/**
 * POST /api/workspaces/[slug]/submissions/[id]/manager-review
 * Manager review of a submission (approve or request revision)
 * Authorization: Workspace MANAGER or ADMIN + must be assigned to challenge
 *
 * CRITICAL SECURITY: managerReviewSubmission validates manager assignment
 */
export const POST = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ slug: string; id: string }> },
  ): Promise<NextResponse> => {
    const { slug, id: submissionId } = await context.params;

    // Verify manager or admin authorization
    const { workspace, user } = await requireManagerOrAdmin(slug);

    // Parse request body
    const body = await request.json();
    const { action, notes } = body;

    // Validate action
    if (!action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 },
      );
    }

    try {
      // Map action to status
      const status =
        action === "approve" ? "MANAGER_APPROVED" : "NEEDS_REVISION";

      // Review submission using helper (includes assignment validation)
      const submission = await managerReviewSubmission({
        submissionId,
        managerId: user.dbUser.id,
        workspaceId: workspace.id,
        status,
        managerNotes: notes || null,
      });

      return NextResponse.json({ submission }, { status: 200 });
    } catch (error) {
      // Helper function throws typed errors, re-throw for withErrorHandling
      if (
        error instanceof ResourceNotFoundError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }

      // Unknown error
      console.error("Error reviewing submission:", error);
      throw new DatabaseError("Failed to review submission");
    }
  },
);
