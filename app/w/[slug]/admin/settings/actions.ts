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
        Challenge: {
          workspaceId
        }
      }
    })

    // Delete all challenges in this workspace
    await prisma.challenge.deleteMany({
      where: { workspaceId }
    })

    // WorkspaceMembership records will be deleted automatically via cascade when workspace is deleted

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

export async function setPointsBalance(formData: FormData) {
  const workspaceId = String(formData.get('workspaceId') || '')
  const userId = String(formData.get('userId') || '')
  const totalPoints = Number(formData.get('totalPoints') || 0)
  const availablePoints = Number(formData.get('availablePoints') || 0)

  if (!workspaceId || !userId) {
    throw new Error('workspaceId and userId are required')
  }

  const safeTotal = Number.isFinite(totalPoints) ? Math.max(0, Math.floor(totalPoints)) : 0
  const safeAvailable = Number.isFinite(availablePoints) ? Math.max(0, Math.floor(availablePoints)) : 0

  await prisma.pointsBalance.upsert({
    where: { userId_workspaceId: { userId, workspaceId } },
    update: { totalPoints: safeTotal, availablePoints: safeAvailable },
    create: { id: crypto.randomUUID(), userId, workspaceId, totalPoints: safeTotal, availablePoints: safeAvailable }
  })

  // Revalidate settings page path
  await revalidatePath(`/w/${workspaceId}/admin/settings`)
}

export async function transferOwnership(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string
  const fromUserId = formData.get("fromUserId") as string
  const toUserId = formData.get("toUserId") as string

  try {
    const { transferWorkspaceOwnership } = await import("@/lib/db/workspace-membership")

    const result = await transferWorkspaceOwnership(workspaceId, fromUserId, toUserId)

    if (!result.success) {
      throw new Error(result.error || "Failed to transfer ownership")
    }

    // Get workspace slug for redirect
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true }
    })

    if (workspace) {
      revalidatePath(`/w/${workspace.slug}/admin/settings`)
    }

    return { success: true }
  } catch (error) {
    console.error("Error transferring ownership:", error)
    throw error
  }
}