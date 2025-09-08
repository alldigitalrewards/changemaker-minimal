import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceBySlug, getUserBySupabaseId } from "@/lib/db/queries"

export async function getCurrentWorkspace(slug: string) {
  return await getWorkspaceBySlug(slug)
}

export async function getUserWorkspaceRole(slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get user with workspace info using standardized query
  const dbUser = await getUserBySupabaseId(user.id)

  // Check if user belongs to this workspace
  if (!dbUser?.workspace || dbUser.workspace.slug !== slug) {
    return null
  }

  return dbUser.role
}

export async function setWorkspaceContext(slug: string) {
  const cookieStore = await cookies()
  cookieStore.set("current-workspace", slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  })
}

export async function getWorkspaceContext() {
  const cookieStore = await cookies()
  return cookieStore.get("current-workspace")?.value
}

export async function clearWorkspaceContext() {
  const cookieStore = await cookies()
  cookieStore.delete("current-workspace")
}