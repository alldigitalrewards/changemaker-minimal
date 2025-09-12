"use server"

import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { isWorkspaceOwner } from "@/lib/db/workspace-membership"

export async function updateWorkspace(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string
  const name = formData.get("name") as string
  const slug = formData.get("slug") as string

  try {
    // Check if slug is already taken by another workspace
    const existing = await prisma.workspace.findFirst({
      where: {
        slug,
        NOT: { id: workspaceId }
      }
    })

    if (existing) {
      throw new Error("Slug already taken")
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name, slug }
    })

    revalidatePath(`/w/${slug}/admin/settings`)
    redirect(`/w/${slug}/admin/settings`)
  } catch (error) {
    console.error("Error updating workspace:", error)
    throw error
  }
}

export async function deleteWorkspace(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string

  try {
    // Delete all enrollments for challenges in this workspace
    await prisma.enrollment.deleteMany({
      where: {
        challenge: {
          workspaceId
        }
      }
    })

    // Delete all challenges in this workspace
    await prisma.challenge.deleteMany({
      where: { workspaceId }
    })

    // Remove workspace association from users
    await prisma.user.updateMany({
      where: { workspaceId },
      data: { workspaceId: null }
    })

    // Delete the workspace
    await prisma.workspace.delete({
      where: { id: workspaceId }
    })

    redirect("/workspaces")
  } catch (error) {
    console.error("Error deleting workspace:", error)
    throw error
  }
}

export async function leaveWorkspace(formData: FormData) {
  const userId = formData.get("userId") as string
  const workspaceId = formData.get("workspaceId") as string

  try {
    // Check if user is the workspace owner
    const isOwner = await isWorkspaceOwner(userId, workspaceId)

    if (isOwner) {
      throw new Error("Workspace owner cannot leave. Please transfer ownership first.")
    }

    // Remove the membership using the existing function
    const { removeMembership, listMemberships, setPrimaryMembership } = await import("@/lib/db/workspace-membership")
    
    const removed = await removeMembership(userId, workspaceId)
    
    if (!removed) {
      throw new Error("Failed to remove workspace membership")
    }

    // If this was the primary workspace, set another one as primary
    const remainingMemberships = await listMemberships(userId)
    if (remainingMemberships.length > 0) {
      await setPrimaryMembership(userId, remainingMemberships[0].workspaceId)
    }

    redirect("/workspaces")
  } catch (error) {
    console.error("Error leaving workspace:", error)
    throw error
  }
}