import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CoralButton } from "@/components/ui/coral-button"
import { ParticipantDetailCard } from "@/components/ui/participant-detail-card"
import { ParticipantRoleToggle } from "./participant-role-toggle"
import { RemoveParticipantAction } from "./remove-participant-action"
import { EmailActions } from "./email-actions"
import { ParticipantManagementDialog } from "../participant-management-dialog"
import { ArrowLeft, Calendar, Mail, User, Trophy, Edit, Coins, Activity as ActivityIcon } from "lucide-react"
import Link from "next/link"
import { ChallengeAssignment } from "./challenge-assignment"
import { RemoveEnrollmentButton } from "./remove-enrollment-button"
import { BulkChallengeAssignment } from "./bulk-challenge-assignment"

export default async function ParticipantDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string; id: string }> 
}) {
  const { slug, id } = await params
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

  // Get participant with full enrollment details (membership-aware to include pending users)
  const participant = await prisma.user.findFirst({
    where: {
      id,
      WorkspaceMembership: {
        some: {
          workspaceId: workspace.id
        }
      }
    },
    include: {
      WorkspaceMembership: {
        where: {
          workspaceId: workspace.id
        }
      },
      Enrollment: {
        where: {
          Challenge: {
            workspaceId: workspace.id
          }
        },
        include: {
          Challenge: {
            select: {
              id: true,
              title: true,
              description: true,
              startDate: true,
              endDate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!participant) {
    redirect(`/w/${slug}/admin/participants`)
  }

  const enrollmentStats = {
    total: participant.Enrollment.length,
    enrolled: participant.Enrollment.filter(e => e.status === 'ENROLLED').length,
    withdrawn: participant.Enrollment.filter(e => e.status === 'WITHDRAWN').length,
    invited: participant.Enrollment.filter(e => e.status === 'INVITED').length
  }

  // Points balance in this workspace
  const points = await prisma.pointsBalance.findUnique({
    where: { userId_workspaceId: { userId: participant.id, workspaceId: workspace.id } }
  })

  // Recent activity events for this user in workspace (optional)
  const recentEvents = await (prisma as any).activityEvent.findMany({
    where: { workspaceId: workspace.id, userId: participant.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/w/${slug}/admin/participants`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Participants
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">Participant Details</h1>
              <p className="text-gray-600">Manage {participant.email} in {workspace.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ParticipantManagementDialog
              slug={slug}
              mode="edit"
              participantId={participant.id}
              participantEmail={participant.email}
              participantRole={participant.WorkspaceMembership[0]?.role as 'ADMIN' | 'PARTICIPANT' | 'MANAGER'}
              showLabel={true}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Participant Info Card */}
        <ParticipantDetailCard participant={participant} slug={slug} />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Administrative actions for this participant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Actions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Email Actions</h4>
              <div className="flex items-center gap-4">
                <EmailActions
                  slug={slug}
                  participantId={participant.id}
                  participantEmail={participant.email}
                />
                <p className="text-sm text-gray-500">
                  Send password reset or resend workspace invitation
                </p>
              </div>
            </div>

            {/* Challenge Assignment */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-2">Add to Challenge</h4>
              <div className="flex items-center gap-4">
                <ChallengeAssignment slug={slug} participantId={participant.id} />
                <p className="text-sm text-gray-500">Enroll this participant into an existing challenge</p>
              </div>
              <div className="mt-3">
                <BulkChallengeAssignment
                  slug={slug}
                  participantId={participant.id}
                  alreadyEnrolledIds={participant.Enrollment.map((e: any) => e.Challenge.id)}
                />
              </div>
            </div>

            {/* Remove Participant */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-2">Danger Zone</h4>
              <div className="flex items-center gap-4">
                <RemoveParticipantAction
                  slug={slug}
                  participantId={participant.id}
                  participantEmail={participant.email}
                />
                <p className="text-sm text-gray-500">
                  Remove this participant and all their enrollments from the workspace
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{enrollmentStats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-2xl font-bold text-green-600">{enrollmentStats.enrolled}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Invited</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <span className="text-2xl font-bold text-yellow-600">{enrollmentStats.invited}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Withdrawn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-2xl font-bold text-blue-600">{enrollmentStats.withdrawn}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{points?.totalPoints ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Challenge Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle>Challenge Enrollments</CardTitle>
            <CardDescription>
              All challenges this participant is enrolled in or has been invited to
            </CardDescription>
          </CardHeader>
          <CardContent>
            {participant.Enrollment.length > 0 ? (
              <div className="space-y-4">
                {participant.Enrollment.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{enrollment.Challenge.title}</h3>
                          <Badge
                            variant={
                              enrollment.status === 'ENROLLED' ? 'default' :
                              enrollment.status === 'INVITED' ? 'secondary' :
                              'outline'
                            }
                            className={
                              enrollment.status === 'ENROLLED'
                                ? "bg-green-100 text-green-800 border-green-200"
                                : enrollment.status === 'INVITED'
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }
                          >
                            {enrollment.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {enrollment.Challenge.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(enrollment.Challenge.startDate).toLocaleDateString()} - {' '}
                              {new Date(enrollment.Challenge.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Enrolled {new Date(enrollment.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Link href={`/w/${slug}/admin/challenges/${enrollment.Challenge.id}`}>
                          <Button variant="outline" size="sm">
                            View Challenge
                          </Button>
                        </Link>
                <div className="mt-2 text-right">
                  <RemoveEnrollmentButton slug={slug} participantId={participant.id} enrollmentId={enrollment.id} />
                </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Enrollments Yet</h3>
                <p className="text-gray-500">
                  This participant hasn't been enrolled in any challenges yet.
                </p>
                <Link href={`/w/${slug}/admin/challenges`} className="mt-4 inline-block">
                  <CoralButton>View Challenges</CoralButton>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity (optional) */}
        {recentEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest events for this user in {workspace.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recentEvents.map((ev: any) => (
                  <li key={ev.id} className="text-sm text-gray-700 flex items-center justify-between">
                    <span>{ev.type}</span>
                    <span className="text-gray-500">{new Date(ev.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}