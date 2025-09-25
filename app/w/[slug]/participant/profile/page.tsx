import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getOrCreatePointsBalance, getUserBySupabaseId, getUserEnrollments } from "@/lib/db/queries"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Calendar, Trophy } from "lucide-react"
import ProfileNameForm from "@/components/ui/profile-name-form"
import ProfileStats from "@/components/ui/profile-stats"

export default async function ParticipantProfilePage({
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
  if (!role) {
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

  // Get membership for joined date
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: dbUser.id, workspaceId: workspace.id } }
  })
  if (!membership) {
    redirect("/workspaces")
  }

  // Workspace-scoped stats
  const [balance, enrollments] = await Promise.all([
    getOrCreatePointsBalance(dbUser.id, workspace.id),
    getUserEnrollments(dbUser.id, workspace.id)
  ])

  const fullName = (user.user_metadata as any)?.full_name || ""

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Your Profile
          </CardTitle>
          <CardDescription>
            Manage your name and view workspace-specific stats
          </CardDescription>
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
            <div>
              <ProfileNameForm slug={slug} initialName={fullName} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Stats */}
      <ProfileStats 
        points={{ total: balance.totalPoints, available: balance.availablePoints }}
        enrollments={{
          total: enrollments.length,
          active: enrollments.filter(e => e.status === "ENROLLED").length,
          withdrawn: enrollments.filter(e => e.status === "WITHDRAWN").length,
          invited: enrollments.filter(e => e.status === "INVITED").length
        }}
      />

      {/* Enrollment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Your Enrollments
          </CardTitle>
          <CardDescription>Challenges you are participating in within {workspace.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-gray-500">You have no enrollments yet.</p>
          ) : (
            <ul className="space-y-2">
              {enrollments.map(e => (
                <li key={e.id} className="flex items-center justify-between border rounded p-3">
                  <div>
                    <p className="font-medium">{e.challenge.title}</p>
                    <p className="text-sm text-gray-500">Status: {e.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


