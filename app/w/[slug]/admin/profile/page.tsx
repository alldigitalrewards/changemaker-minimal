import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getOrCreatePointsBalance, getUserBySupabaseId, getUserEnrollments } from "@/lib/db/queries"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Calendar, Trophy } from "lucide-react"
import ProfileNameForm from "@/components/ui/profile-name-form"
// Removed ProfileStats for admin self profile (not needed)
import ProfileAdminForm from "@/components/ui/profile-admin-form"

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Admin Profile
          </CardTitle>
          <CardDescription>Manage your admin account details for this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Joined {new Date(membership.joinedAt).toLocaleDateString()}
              </div>
              <div>
                <Badge variant="outline">{role}</Badge>
              </div>
            </div>
            <div className="space-y-6">
              <ProfileNameForm initialName={fullName} />
              <ProfileAdminForm initial={{ timezone: userMetadata.timezone }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin-specific settings live below; stats intentionally omitted */}
    </div>
  )
}


