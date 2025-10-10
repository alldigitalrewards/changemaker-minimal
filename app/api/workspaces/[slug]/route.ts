import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth/api-auth'
import { isWorkspaceOwner } from '@/lib/db/workspace-membership'
import { prisma } from '@/lib/prisma'

type Params = Promise<{ slug: string }>

/**
 * GET /api/workspaces/[slug]
 * Get workspace details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { slug } = await params
    const { workspace, user } = await requireWorkspaceAccess(slug)

    return NextResponse.json({ workspace })
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error
    }
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workspaces/[slug]
 * Delete workspace (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { slug } = await params
    const { workspace, user } = await requireWorkspaceAccess(slug)

    // Verify user is workspace owner (primary admin)
    const isOwner = await isWorkspaceOwner(user.dbUser.id, workspace.id)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the workspace owner can delete the workspace' },
        { status: 403 }
      )
    }

    // Delete workspace (cascade will handle related records)
    await prisma.workspace.delete({
      where: { id: workspace.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Workspace deleted successfully'
    })
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Error deleting workspace:', error)
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    )
  }
}
