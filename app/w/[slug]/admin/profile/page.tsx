import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getOrCreatePointsBalance, getUserBySupabaseId, getUserEnrollments } from "@/lib/db/queries"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Calendar, Trophy } from "lucide-react"
import AdminProfileForm from "@/components/ui/AdminProfileForm"

export default async function AdminProfilePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== 'ADMIN') {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) {
    redirect("/auth/login")
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: dbUser.id, workspaceId: workspace.id } }
  })
  if (!membership) {
    redirect("/workspaces")
  }

  // Admin page focuses on admin preferences; omit points/enrollment stats

  const userMetadata = (user.user_metadata as any) || {}
  const fullName = userMetadata.full_name || ""
  const organization = userMetadata.organization || workspace.name

  return (
    <div className="space-y-6">
      <AdminProfileForm
        initial={{
          fullName,
          email: user.email!,
          joinedAtISO: membership.joinedAt.toISOString(),
          roleLabel: role,
          organization,
          avatarUrl: (user.user_metadata as any)?.avatar_url || null,
          timezone: userMetadata.timezone,
          dateFormat: userMetadata.date_format,
          reducedMotion: userMetadata.reduced_motion,
          showKeyboardHints: userMetadata.show_keyboard_hints,
          notificationPrefs: (userMetadata.notification_prefs as any) || undefined
        }}
      />
    </div>
  )
}


