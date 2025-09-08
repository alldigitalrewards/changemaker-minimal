import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function AdminParticipantsPage({ 
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

  // Get all participants in workspace with their enrollments
  const participants = await prisma.user.findMany({
    where: {
      workspaceId: workspace.id,
      role: "PARTICIPANT"
    },
    include: {
      enrollments: {
        where: {
          challenge: {
            workspaceId: workspace.id
          }
        },
        include: {
          challenge: {
            select: {
              title: true
            }
          }
        }
      }
    }
  })

  // Get enrollment statistics
  const enrollmentStats = await prisma.enrollment.groupBy({
    by: ["status"],
    where: {
      challenge: {
        workspaceId: workspace.id
      }
    },
    _count: true
  })

  const totalEnrollments = enrollmentStats.reduce((sum, stat) => sum + stat._count, 0)
  const activeEnrollments = enrollmentStats.find(s => s.status === "active")?._count || 0
  const completedEnrollments = enrollmentStats.find(s => s.status === "completed")?._count || 0

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Participants</h1>
        <p className="text-gray-600">Manage participants in {workspace.name}</p>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{participants.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalEnrollments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{activeEnrollments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{completedEnrollments}</p>
            </CardContent>
          </Card>
        </div>

        {/* Participants Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Participants</CardTitle>
            <CardDescription>View and manage workspace participants</CardDescription>
          </CardHeader>
          <CardContent>
            {participants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrolled Challenges</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">{participant.email}</TableCell>
                      <TableCell>
                        {participant.enrollments.length > 0 ? (
                          <div className="space-y-1">
                            {participant.enrollments.map((enrollment) => (
                              <div key={enrollment.id} className="text-sm">
                                {enrollment.challenge.title}
                                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                                  enrollment.status === "active" 
                                    ? "bg-green-100 text-green-800"
                                    : enrollment.status === "completed"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {enrollment.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">No enrollments</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-gray-500">
                No participants in this workspace yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}