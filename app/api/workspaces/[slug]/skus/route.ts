import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;

/**
 * GET /api/workspaces/[slug]/skus
 * Get all active SKUs assigned to a workspace
 * Used by workspace admins to see available SKUs for reward issuance
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);

    const skus = await prisma.workspaceSku.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
      },
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ skus });
  }
);
