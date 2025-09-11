import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceBySlug } from "@/lib/db/queries"
import { getUserWorkspaceRole as getCompatibleWorkspaceRole } from "@/lib/db/workspace-compatibility"

export async function getCurrentWorkspace(slug: string) {
  return await getWorkspaceBySlug(slug)
}

export async function getUserWorkspaceRole(slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Use the new membership-aware compatibility function
  return await getCompatibleWorkspaceRole(user.id, slug)
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