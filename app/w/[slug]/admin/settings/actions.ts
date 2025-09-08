"use server"

import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

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