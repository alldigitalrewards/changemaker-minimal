import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, withErrorHandling } from "@/lib/auth/api-auth";

type Params = Promise<{ workspaceId: string }>;

/**
 * GET /api/admin/workspaces/[workspaceId]/skus
 * Get all SKUs assigned to a workspace
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    await requirePlatformAdmin();
    const { workspaceId } = await params;

    const skus = await prisma.workspaceSku.findMany({
      where: { workspaceId },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ],
      include: {
        User: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return NextResponse.json({ skus });
  }
);

/**
 * POST /api/admin/workspaces/[workspaceId]/skus
 * Add a SKU to a workspace
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const user = await requirePlatformAdmin();
    const { workspaceId } = await params;

    const body = await request.json();
    const { skuId, name, description, value, isDefault = false } = body;

    // Validate required fields
    if (!skuId || !name) {
      return NextResponse.json(
        { error: "SKU ID and name are required" },
        { status: 400 }
      );
    }

    // Check if SKU already exists for this workspace
    const existing = await prisma.workspaceSku.findUnique({
      where: {
        workspaceId_skuId: {
          workspaceId,
          skuId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This SKU is already assigned to this workspace" },
        { status: 409 }
      );
    }

    // Create the SKU assignment
    const sku = await prisma.workspaceSku.create({
      data: {
        workspaceId,
        skuId,
        name,
        description,
        value,
        isDefault,
        addedBy: user.dbUser.id,
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

    return NextResponse.json({ sku }, { status: 201 });
  }
);
