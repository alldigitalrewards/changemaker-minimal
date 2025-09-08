import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function ParticipantDashboard({ 
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
  if (!role || role !== "PARTICIPANT") {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  // Get user's enrollments
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    include: {
      enrollments: {
        include: {
          challenge: true
        }
      }
    }
  })

  const enrollments = dbUser?.enrollments || []

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
          <CardHeader>
            <CardTitle>Your Activity</CardTitle>
            <CardDescription>Overview of your participation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-coral-500">{enrollments.length}</p>
                <p className="text-sm text-gray-600">Enrolled Challenges</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-coral-500">
                  {enrollments.filter(e => e.status === "active").length}
                </p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-coral-500">
                  {enrollments.filter(e => e.status === "completed").length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrolled Challenges */}
        <Card>
          <CardHeader>
            <CardTitle>Your Challenges</CardTitle>
            <CardDescription>Challenges you are enrolled in</CardDescription>
          </CardHeader>
          <CardContent>
            {enrollments.length > 0 ? (
              <div className="grid gap-4">
                {enrollments.map((enrollment) => (
                  <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{enrollment.challenge.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {enrollment.challenge.description}
                          </CardDescription>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          enrollment.status === "active" 
                            ? "bg-green-100 text-green-800"
                            : enrollment.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {enrollment.status}
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You haven't enrolled in any challenges yet</p>
                <Link href={`/w/${slug}/participant/challenges`}>
                  <Button>Browse Challenges</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Link href={`/w/${slug}/participant/challenges`}>
                <Button variant="outline">Browse Challenges</Button>
              </Link>
              <Link href="/workspaces">
                <Button variant="outline">Switch Workspace</Button>
              </Link>
            </div>
          </CardContent>
      </Card>
    </div>
  )
}