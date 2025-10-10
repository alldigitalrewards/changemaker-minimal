"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createMembership } from "@/lib/db/workspace-membership"
import { nanoid } from "nanoid"

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

    // Create workspace with a unique tenant scope
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        tenantId: `tenant_${nanoid(12)}`
      }
    })

    // Create membership for creator as admin and set as primary
    const membership = await createMembership(userId, workspace.id, 'ADMIN', true)
    
    if (!membership) {
      throw new Error("Failed to create workspace membership")
    }

    revalidatePath("/workspaces")
    return { success: true, slug: workspace.slug }
  } catch (error) {
    console.error("Error creating workspace:", error)
    return { success: false, error: "Failed to create workspace" }
  }
}

export async function joinWorkspace(userId: string, workspaceId: string) {
  try {
    // Get workspace details
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true }
    })

    if (!workspace) {
      throw new Error("Workspace not found")
    }

    // Create membership as participant (not primary unless it's their first)
    const existingMemberships = await prisma.workspaceMembership.count({
      where: { userId }
    })
    
    const isFirstWorkspace = existingMemberships === 0
    const membership = await createMembership(userId, workspaceId, 'PARTICIPANT', isFirstWorkspace)
    
    if (!membership) {
      throw new Error("Failed to create workspace membership")
    }

    revalidatePath("/workspaces")
    return { success: true, slug: workspace.slug }
  } catch (error) {
    console.error("Error joining workspace:", error)
    return { success: false, error: "Failed to join workspace" }
  }
}


export async function setPrimaryWorkspace(userId: string, workspaceId: string) {
  try {
    const { setPrimaryMembership } = await import("@/lib/db/workspace-membership")
    
    const updated = await setPrimaryMembership(userId, workspaceId)
    
    if (!updated) {
      throw new Error("Failed to set primary workspace")
    }

    revalidatePath("/workspaces")
    return { success: true }
  } catch (error) {
    console.error("Error setting primary workspace:", error)
    return { success: false, error: "Failed to set primary workspace" }
  }
}
