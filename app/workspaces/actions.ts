"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createWorkspace(formData: FormData, userId: string) {
  const name = formData.get("name") as string
  const slug = formData.get("slug") as string

  try {
    // Check if slug is already taken
    const existing = await prisma.workspace.findUnique({
      where: { slug }
    })

    if (existing) {
      throw new Error("Slug already taken")
    }

    // Create workspace and update user
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        users: {
          connect: { id: userId }
        }
      }
    })

    revalidatePath("/workspaces")
    return { success: true, slug: workspace.slug }
  } catch (error) {
    console.error("Error creating workspace:", error)
    return { success: false, error: "Failed to create workspace" }
  }
}

export async function joinWorkspace(userId: string, workspaceId: string) {
  try {
    // Update user's workspace
    await prisma.user.update({
      where: { id: userId },
      data: { workspaceId }
    })

    // Get workspace slug for redirect
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true }
    })

    revalidatePath("/workspaces")
    return { success: true, slug: workspace?.slug }
  } catch (error) {
    console.error("Error joining workspace:", error)
    return { success: false, error: "Failed to join workspace" }
  }
}

export async function leaveWorkspace(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { workspaceId: null }
    })

    revalidatePath("/workspaces")
    return { success: true }
  } catch (error) {
    console.error("Error leaving workspace:", error)
    return { success: false, error: "Failed to leave workspace" }
  }
}