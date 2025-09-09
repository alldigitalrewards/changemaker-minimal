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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserPlus } from "lucide-react"
// import { ParticipantBulkActions } from "./bulk-actions" // TODO: Create this component

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
  const activeEnrollments = enrollmentStats.find(s => s.status === "ACTIVE")?._count || 0
  const completedEnrollments = enrollmentStats.find(s => s.status === "COMPLETED")?._count || 0

  // Get challenges for bulk operations
  const challenges = await prisma.challenge.findMany({
    where: {
      workspaceId: workspace.id
    },
    select: {
      id: true,
      title: true
    },
    orderBy: {
      title: 'asc'
    }
  })

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Participants</CardTitle>
                <CardDescription>View and manage workspace participants</CardDescription>
              </div>
              {challenges.length > 0 && participants.length > 0 && (
                <Button className="bg-coral-500 hover:bg-coral-600">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Bulk Add to Challenge
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {participants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrolled Challenges</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
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
                                <Badge
                                  variant={enrollment.status === "ACTIVE" ? "default" : "secondary"}
                                  className="ml-2 text-xs"
                                >
                                  {enrollment.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">No enrollments</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add to Challenge
                        </Button>
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