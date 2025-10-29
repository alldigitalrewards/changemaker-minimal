import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceBySlug, getManagerChallenges, getUserBySupabaseId } from "@/lib/db/queries"
import { getMembership } from "@/lib/db/workspace-membership"
import { type Role } from "@/lib/types"
import { type Challenge } from "@prisma/client"

// Re-export Role type for convenience
export { type Role } from "@/lib/types"

/**
 * Get workspace by slug
 */
export async function getCurrentWorkspace(slug: string) {
  return await getWorkspaceBySlug(slug)
}

/**
 * Get user's role in a workspace by slug
 * Returns ADMIN, MANAGER, or PARTICIPANT based on WorkspaceMembership
 */
export async function getUserWorkspaceRole(slug: string): Promise<Role | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get DB user and workspace
  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) return null

  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return null

  // Check WorkspaceMembership
  const membership = await getMembership(dbUser.id, workspace.id)
  return membership?.role || null
}

/**
 * Check if user is a workspace manager
 */
export async function isWorkspaceManager(userId: string, workspaceId: string): Promise<boolean> {
  try {
    const dbUser = await getUserBySupabaseId(userId)
    if (!dbUser) return false

    const membership = await getMembership(dbUser.id, workspaceId)
    return membership?.role === 'MANAGER'
  } catch (error) {
    console.error('Error checking if user is manager:', error)
    return false
  }
}

/**
 * Get challenges assigned to a manager
 * Uses the getManagerChallenges query which handles ChallengeManager assignments
 */
export async function getManagerAssignedChallenges(
  managerId: string,
  workspaceId: string
): Promise<Challenge[]> {
  try {
    const dbUser = await getUserBySupabaseId(managerId)
    if (!dbUser) return []

    // Use the dedicated query function which handles manager verification
    // and ChallengeManager assignments
    return await getManagerChallenges(dbUser.id, workspaceId)
  } catch (error) {
    console.error('Error getting manager assigned challenges:', error)
    return []
  }
}

/**
 * Set workspace context in cookies
 */
export async function setWorkspaceContext(slug: string) {
  const cookieStore = await cookies()
  cookieStore.set("current-workspace", slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  })
}

/**
 * Get current workspace slug from cookies
 */
export async function getWorkspaceContext() {
  const cookieStore = await cookies()
  return cookieStore.get("current-workspace")?.value
}

/**
 * Clear workspace context cookie
 */
export async function clearWorkspaceContext() {
  const cookieStore = await cookies()
  cookieStore.delete("current-workspace")
}