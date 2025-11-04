import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getRecentWorkspaceActivities } from "@/lib/db/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, Trophy, ClipboardList, Eye, MessageSquare } from "lucide-react"
import { CollapsibleActivityFeed } from "../../admin/dashboard/collapsible-activity-feed"
import { formatDistanceToNow } from "date-fns"

export default async function ManagerDashboard({
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
  if (!role || !["ADMIN", "MANAGER"].includes(role)) {
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
      WorkspaceMembership: {
        include: {
          User: true
        }
      },
      Challenge: {
        include: {
          Enrollment: true
        }
      }
    }
  })

  // Get recent communications
  const recentCommunications = await prisma.workspaceCommunication.findMany({
    where: { workspaceId: workspace.id },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
        },
      },
    },
    orderBy: { sentAt: 'desc' },
    take: 3,
  })

  const participantCount = stats?.WorkspaceMembership.filter(m => m.role === "PARTICIPANT").length || 0
  const challengeCount = stats?.Challenge.length || 0
  const totalEnrollments = stats?.Challenge.reduce((acc, c) => acc + c.Enrollment.length, 0) || 0

  // Get recent activities
  const {
    events: rawEvents,
    pendingSubmissions,
    pendingSubmissionCount,
    oldestPendingSubmission
  } = await getRecentWorkspaceActivities(workspace.id)

  // Transform events to normalize Prisma relation names to expected field names
  const events = rawEvents.map((event: any) => ({
    ...event,
    user: event.User_ActivityEvent_userIdToUser,
    actor: event.User_ActivityEvent_actorUserIdToUser,
    challenge: event.Challenge
  }))

  // Extract challengeId for client components (to avoid serialization issues)
  const firstPendingChallengeId = pendingSubmissions[0]?.Activity?.challengeId

  // Transform pendingSubmissions for client component serialization
  const serializedPendingSubmissions = pendingSubmissions.map(submission => ({
    id: submission.id,
    submittedAt: submission.submittedAt.toISOString(),
    textContent: submission.textContent,
    linkUrl: submission.linkUrl,
    fileUrls: submission.fileUrls,
    activityId: submission.activityId,
    User: {
      id: submission.User.id,
      email: submission.User.email,
      firstName: submission.User.firstName,
      lastName: submission.User.lastName,
      displayName: submission.User.displayName
    },
    Activity: {
      id: submission.Activity.id,
      pointsValue: submission.Activity.ActivityTemplate.basePoints,
      challengeId: submission.Activity.challengeId,
      ActivityTemplate: {
        name: submission.Activity.ActivityTemplate.name,
        description: submission.Activity.ActivityTemplate.description,
        pointsValue: submission.Activity.ActivityTemplate.basePoints
      },
      Challenge: {
        id: submission.Activity.Challenge.id,
        title: submission.Activity.Challenge.title
      }
    },
    activity: {
      challengeId: submission.Activity.challengeId
    }
  }))

  return (
    <div className="space-y-6">
      {/* Pending Submissions - Priority Alert */}
      {pendingSubmissionCount > 0 && firstPendingChallengeId && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20" />
                  <div className="relative bg-amber-400 rounded-full p-3">
                    <ClipboardList className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {pendingSubmissionCount} {pendingSubmissionCount === 1 ? 'submission' : 'submissions'} awaiting review
                  </h3>
                  <p className="text-sm text-gray-600">
                    {oldestPendingSubmission
                      ? `Oldest pending ${formatDistanceToNow(new Date(oldestPendingSubmission.submittedAt), { addSuffix: true })}`
                      : 'Review submissions to award points'}
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="bg-coral-500 hover:bg-coral-600">
                <Link href={`/w/${slug}/admin/challenges/${firstPendingChallengeId}/submissions?status=pending`}>
                  Review Now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href={`/w/${slug}/admin/participants`}>
          <Card className="hover:shadow-md hover:border-coral-300 transition-all cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-coral-600 transition-colors">Participants</CardTitle>
              <Users className="h-4 w-4 text-coral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{participantCount}</div>
              <p className="text-xs text-gray-500 mt-1">
                Active members
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/w/${slug}/admin/challenges`}>
          <Card className="hover:shadow-md hover:border-coral-300 transition-all cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-coral-600 transition-colors">Challenges</CardTitle>
              <Trophy className="h-4 w-4 text-coral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{challengeCount}</div>
              <p className="text-xs text-gray-500 mt-1">
                Total available
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Enrollments</CardTitle>
            <ClipboardList className="h-4 w-4 text-coral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalEnrollments}</div>
            <p className="text-xs text-gray-500 mt-1">
              Total active
            </p>
          </CardContent>
        </Card>

        {pendingSubmissionCount > 0 && firstPendingChallengeId ? (
          <Link href={`/w/${slug}/admin/challenges/${firstPendingChallengeId}/submissions?status=pending`}>
            <Card className="border-amber-200 bg-amber-50/50 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-amber-700 transition-colors">Pending Review</CardTitle>
                <div className="relative">
                  <ClipboardList className="h-4 w-4 text-coral-500" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">
                  {pendingSubmissionCount}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Need attention
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
              <ClipboardList className="h-4 w-4 text-coral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {pendingSubmissionCount}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                All caught up
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Announcements and Activity Feed side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements Widget */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-coral-100 text-coral-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Recent Announcements</CardTitle>
                  <CardDescription>Latest workspace updates</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentCommunications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">
                  No announcements yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCommunications.map((comm) => {
                  const senderName = comm.sender
                    ? comm.sender.displayName ||
                      `${comm.sender.firstName || ''} ${comm.sender.lastName || ''}`.trim() ||
                      comm.sender.email
                    : 'System'

                  return (
                    <div
                      key={comm.id}
                      className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{comm.subject}</h4>
                        <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {comm.audience}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{comm.message}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{senderName}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(comm.sentAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  )
                })}
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href={`/w/${slug}/admin/communications`}>
                    View all announcements
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <CollapsibleActivityFeed
          workspaceId={workspace.id}
          slug={slug}
          events={events}
          pendingSubmissions={serializedPendingSubmissions}
        />
      </div>

      {/* Recent Challenges */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Challenges</CardTitle>
              <CardDescription>Latest challenges in your workspace</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.Challenge.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">No challenges yet</h3>
              <p className="text-sm text-gray-600 max-w-sm mx-auto">
                Challenges will appear here once they are created by workspace admins
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.Challenge.slice(0, 3).map((challenge) => (
                <div
                  key={challenge.id}
                  className="group p-4 border border-gray-200 rounded-lg hover:border-coral-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-coral-600 transition-colors">
                          {challenge.title}
                        </h3>
                        <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {challenge.Enrollment.length} enrolled
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">{challenge.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0" asChild>
                      <Link href={`/w/${slug}/admin/challenges/${challenge.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {stats?.Challenge && stats.Challenge.length > 3 && (
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link href={`/w/${slug}/admin/challenges`}>
                    View all {stats.Challenge.length} challenges
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              asChild
              variant="outline"
              className="h-auto p-4 justify-start hover:border-coral-300 hover:bg-coral-50 group transition-colors"
            >
              <Link href={`/w/${slug}/admin/challenges`} className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-coral-100 text-coral-600 group-hover:bg-coral-200 transition-colors">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 group-hover:text-coral-700 transition-colors">View Challenges</div>
                  <div className="text-sm text-gray-500">Browse all challenges</div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto p-4 justify-start hover:border-coral-300 hover:bg-coral-50 group transition-colors"
            >
              <Link href={`/w/${slug}/admin/participants`} className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-coral-100 text-coral-600 group-hover:bg-coral-200 transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 group-hover:text-coral-700 transition-colors">View Participants</div>
                  <div className="text-sm text-gray-500">See workspace members</div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto p-4 justify-start hover:border-coral-300 hover:bg-coral-50 group transition-colors"
            >
              <Link href={`/w/${slug}/admin/challenges`} className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-coral-100 text-coral-600 group-hover:bg-coral-200 transition-colors">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 group-hover:text-coral-700 transition-colors">View All Submissions</div>
                  <div className="text-sm text-gray-500">Review participant work</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
