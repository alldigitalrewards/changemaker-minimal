import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check admin access
    const role = await getUserWorkspaceRole(slug)
    if (!role || role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const workspace = await getCurrentWorkspace(slug)
    if (!workspace) {
      return NextResponse.json(
        { message: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check if participant exists and belongs to this workspace
    const participant = await prisma.user.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
        role: "PARTICIPANT"
      }
    })

    if (!participant) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      )
    }

    // Delete all enrollments first (due to foreign key constraints)
    await prisma.enrollment.deleteMany({
      where: {
        userId: id,
        challenge: {
          workspaceId: workspace.id
        }
      }
    })

    // Remove participant from workspace (set workspaceId to null)
    await prisma.user.update({
      where: { id },
      data: { 
        workspaceId: null,
        role: "PARTICIPANT" 
      }
    })

    return NextResponse.json({ 
      message: "Participant removed successfully" 
    })
  } catch (error) {
    console.error("Error removing participant:", error)
    return NextResponse.json(
      { message: "Failed to remove participant" },
      { status: 500 }
    )
  }
}