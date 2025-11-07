import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, withErrorHandling } from "@/lib/auth/api-auth";

type Params = Promise<{ workspaceId: string; skuRecordId: string }>;

/**
 * DELETE /api/admin/workspaces/[workspaceId]/skus/[skuRecordId]
 * Remove a SKU from a workspace
 */
export const DELETE = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    await requirePlatformAdmin();
    const { workspaceId, skuRecordId } = await params;

    // Check if SKU exists
    const sku = await prisma.workspaceSku.findUnique({
      where: { id: skuRecordId },
    });

    if (!sku) {
      return NextResponse.json(
        { error: "SKU not found" },
        { status: 404 }
      );
    }

    // Verify it belongs to the correct workspace
    if (sku.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "SKU does not belong to this workspace" },
        { status: 403 }
      );
    }

    // Delete the SKU
    await prisma.workspaceSku.delete({
      where: { id: skuRecordId },
    });

    return NextResponse.json({ success: true });
  }
);

/**
 * PATCH /api/admin/workspaces/[workspaceId]/skus/[skuRecordId]
 * Update a SKU assignment (e.g., toggle active status)
 */
export const PATCH = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    await requirePlatformAdmin();
    const { workspaceId, skuRecordId } = await params;

    const body = await request.json();
    const { isActive, name, description, value } = body;

    // Check if SKU exists
    const sku = await prisma.workspaceSku.findUnique({
      where: { id: skuRecordId },
    });

    if (!sku) {
      return NextResponse.json(
        { error: "SKU not found" },
        { status: 404 }
      );
    }

    // Verify it belongs to the correct workspace
    if (sku.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "SKU does not belong to this workspace" },
        { status: 403 }
      );
    }

    // Update the SKU
    const updated = await prisma.workspaceSku.update({
      where: { id: skuRecordId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(value !== undefined && { value }),
      },
      include: {
        User: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ sku: updated });
  }
);
