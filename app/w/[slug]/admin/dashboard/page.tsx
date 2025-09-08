import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, Trophy, Plus } from "lucide-react"

export default async function AdminDashboard({ 
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
  if (!role || role !== "ADMIN") {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  // Get workspace stats
  const stats = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      users: true,
      challenges: {
        include: {
          enrollments: true
        }
      }
    }
  })

  const participantCount = stats?.users.filter(u => u.role === "PARTICIPANT").length || 0
  const challengeCount = stats?.challenges.length || 0
  const totalEnrollments = stats?.challenges.reduce((acc, c) => acc + c.enrollments.length, 0) || 0

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-coral-600">{participantCount}</div>
            <p className="text-xs text-muted-foreground">
              Active workspace members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Challenges</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-coral-600">{challengeCount}</div>
            <p className="text-xs text-muted-foreground">
              Total challenges created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-coral-600">{totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              Across all challenges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Challenges */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Challenges</CardTitle>
              <CardDescription>Latest challenges in your workspace</CardDescription>
            </div>
            <Button asChild>
              <Link href={`/w/${slug}/admin/challenges`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Challenge
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.challenges.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No challenges created yet</p>
              <Button asChild>
                <Link href={`/w/${slug}/admin/challenges`}>Create Your First Challenge</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stats?.challenges.slice(0, 3).map((challenge) => (
                <div key={challenge.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium">{challenge.title}</h3>
                    <p className="text-sm text-gray-600">{challenge.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {challenge.enrollments.length} enrollments
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/w/${slug}/admin/challenges`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 flex items-start space-x-3">
              <Link href={`/w/${slug}/admin/challenges`}>
                <Trophy className="h-5 w-5 text-coral-500 mt-0.5" />
                <div className="text-left">
                  <div className="font-medium">Manage Challenges</div>
                  <div className="text-sm text-gray-500">Create and edit challenges</div>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex items-start space-x-3">
              <Link href={`/w/${slug}/admin/participants`}>
                <Users className="h-5 w-5 text-coral-500 mt-0.5" />
                <div className="text-left">
                  <div className="font-medium">View Participants</div>
                  <div className="text-sm text-gray-500">Manage workspace members</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}