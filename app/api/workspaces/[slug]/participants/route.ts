import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

/**
 * GET /api/workspaces/[slug]/participants
 * Get all participants (users) in a workspace
 * Used by workspace admins to see available users for reward issuance
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);

    const participants = await prisma.user.findMany({
      where: {
        WorkspaceMembership: {
          some: {
            workspaceId: workspace.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" },
        { email: "asc" },
      ],
    });

    return NextResponse.json({ participants });
  }
);
