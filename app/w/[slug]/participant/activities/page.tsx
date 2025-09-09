import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getUserBySupabaseId, getUserActivitySubmissions, getOrCreatePointsBalance } from "@/lib/db/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Trophy, 
  TrendingUp,
  Calendar,
  Star,
  ArrowRight,
  Eye,
  Filter
} from "lucide-react"
import { format } from "date-fns"

function ActivitiesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-gray-200 rounded-lg h-24" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-24" />
        ))}
      </div>
      <div className="bg-gray-200 rounded-lg h-12" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32" />
        ))}
      </div>
    </div>
  )
}

interface ActivitySubmissionCardProps {
  submission: {
    id: string
    status: string
    textContent: string | null
    fileUrls: string[]
    linkUrl: string | null
    pointsAwarded: number | null
    reviewNotes: string | null
    submittedAt: Date
    activity: {
      id: string
      pointsValue: number
      template: {
        name: string
        type: string
        requiresApproval: boolean
      }
      challenge: {
        id: string
        title: string
      }
    }
  }
  workspaceSlug: string
}

function ActivitySubmissionCard({ submission, workspaceSlug }: ActivitySubmissionCardProps) {
  const statusConfig = {
    PENDING: { 
      color: "bg-yellow-50 text-yellow-700 border-yellow-200", 
      icon: Clock,
      label: "Under Review"
    },
    APPROVED: { 
      color: "bg-green-50 text-green-700 border-green-200", 
      icon: CheckCircle,
      label: "Approved"
    },
    REJECTED: { 
      color: "bg-red-50 text-red-700 border-red-200", 
      icon: AlertTriangle,
      label: "Needs Revision"
    },
    DRAFT: { 
      color: "bg-gray-50 text-gray-700 border-gray-200", 
      icon: FileText,
      label: "Draft"
    },
  }

  const config = statusConfig[submission.status as keyof typeof statusConfig] || statusConfig.PENDING
  const StatusIcon = config.icon

  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg truncate">{submission.activity.template.name}</CardTitle>
              <Badge variant="outline" className={config.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-coral-500" />
              <span>{submission.activity.challenge.title}</span>
            </CardDescription>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="font-medium">
              {submission.pointsAwarded ? `${submission.pointsAwarded}` : submission.activity.pointsValue} pts
            </div>
            <div className="text-xs">
              {format(new Date(submission.submittedAt), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-xs bg-gray-50 p-3 rounded-lg">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-coral-500" />
            {submission.activity.template.type.replace('_', ' ').toLowerCase()}
          </span>
          {submission.activity.template.requiresApproval && (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-blue-500" />
              Requires approval
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-green-500" />
            Submitted {format(new Date(submission.submittedAt), 'h:mm a')}
          </span>
        </div>

        {/* Submission Content Preview */}
        {(submission.textContent || submission.linkUrl || submission.fileUrls.length > 0) && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            {submission.textContent && (
              <div className="mb-2">
                <p className="text-sm font-medium text-blue-800">Text Submission</p>
                <p className="text-xs text-blue-600 line-clamp-2">{submission.textContent}</p>
              </div>
            )}
            {submission.linkUrl && (
              <div className="mb-2">
                <p className="text-sm font-medium text-blue-800">Link</p>
                <p className="text-xs text-blue-600 truncate">{submission.linkUrl}</p>
              </div>
            )}
            {submission.fileUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-800">Files</p>
                <p className="text-xs text-blue-600">{submission.fileUrls.length} file(s) uploaded</p>
              </div>
            )}
          </div>
        )}

        {/* Points Awarded */}
        {submission.status === 'APPROVED' && submission.pointsAwarded && (
          <div className="p-3 bg-green-100 rounded-lg text-center border border-green-200">
            <p className="text-sm font-semibold text-green-700">
              <Star className="w-4 h-4 inline mr-1" />
              {submission.pointsAwarded} points earned!
            </p>
          </div>
        )}

        {/* Review Notes */}
        {submission.reviewNotes && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-1">Feedback</p>
            <p className="text-xs text-amber-700">{submission.reviewNotes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <Link
            href={`/w/${workspaceSlug}/participant/challenges/${submission.activity.challenge.id}`}
            className="inline-flex items-center text-sm text-coral-600 hover:text-coral-700 font-medium transition-colors"
          >
            <Eye className="w-4 h-4 mr-1" />
            View Challenge
          </Link>
          {submission.status === 'REJECTED' && (
            <Button size="sm" variant="outline" className="text-amber-600 hover:text-amber-700">
              Resubmit
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function ParticipantActivitiesPage({ 
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

  // Get user from database using standardized query
  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) {
    redirect("/auth/login")
  }

  // Get user's activity submissions and points balance
  const [submissions, pointsBalance] = await Promise.all([
    getUserActivitySubmissions(dbUser.id, workspace.id),
    getOrCreatePointsBalance(dbUser.id, workspace.id)
  ])

  // Calculate stats
  const totalSubmissions = submissions.length
  const pendingSubmissions = submissions.filter(s => s.status === 'PENDING').length
  const approvedSubmissions = submissions.filter(s => s.status === 'APPROVED').length
  const rejectedSubmissions = submissions.filter(s => s.status === 'REJECTED').length
  const draftSubmissions = submissions.filter(s => s.status === 'DRAFT').length
  const totalPointsEarned = submissions.reduce((sum, s) => sum + (s.pointsAwarded || 0), 0)

  // Group submissions by status
  const pendingList = submissions.filter(s => s.status === 'PENDING')
  const approvedList = submissions.filter(s => s.status === 'APPROVED')
  const rejectedList = submissions.filter(s => s.status === 'REJECTED')
  const draftList = submissions.filter(s => s.status === 'DRAFT')

  return (
    <Suspense fallback={<ActivitiesSkeleton />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-coral-50 to-blue-50 rounded-lg p-6 border border-coral-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Activities</h1>
          <p className="text-gray-600">
            Track all your activity submissions across challenges in {workspace.name}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                  <p className="text-3xl font-bold text-blue-600">{totalSubmissions}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Under Review</p>
                  <p className="text-3xl font-bold text-yellow-600">{pendingSubmissions}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{approvedSubmissions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-coral-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Points Earned</p>
                  <p className="text-3xl font-bold text-coral-600">{totalPointsEarned}</p>
                </div>
                <Star className="h-8 w-8 text-coral-500 opacity-75" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-coral-500" />
              Activity Submissions
            </CardTitle>
            <CardDescription>
              View and manage your submissions organized by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                <TabsTrigger value="all" className="text-xs md:text-sm py-2">
                  All
                  <Badge className="ml-1 bg-gray-500 text-white text-[10px] px-1.5 py-0.5">
                    {totalSubmissions}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs md:text-sm py-2">
                  Review
                  {pendingSubmissions > 0 && (
                    <Badge className="ml-1 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5">
                      {pendingSubmissions}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs md:text-sm py-2">
                  Approved
                  {approvedSubmissions > 0 && (
                    <Badge className="ml-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5">
                      {approvedSubmissions}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs md:text-sm py-2">
                  Revision
                  {rejectedSubmissions > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5">
                      {rejectedSubmissions}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="drafts" className="text-xs md:text-sm py-2">
                  Drafts
                  {draftSubmissions > 0 && (
                    <Badge className="ml-1 bg-gray-500 text-white text-[10px] px-1.5 py-0.5">
                      {draftSubmissions}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* All Submissions */}
              <TabsContent value="all" className="space-y-4">
                {submissions.length > 0 ? (
                  <div className="grid gap-4">
                    {submissions.map((submission) => (
                      <ActivitySubmissionCard 
                        key={submission.id} 
                        submission={submission} 
                        workspaceSlug={slug}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No activities submitted yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      Start participating in challenges to submit activities and earn points.
                    </p>
                    <Button asChild className="bg-coral-500 hover:bg-coral-600">
                      <Link href={`/w/${slug}/participant/challenges`}>
                        <Trophy className="h-4 w-4 mr-2" />
                        Browse Challenges
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Pending Submissions */}
              <TabsContent value="pending" className="space-y-4">
                {pendingList.length > 0 ? (
                  <div className="grid gap-4">
                    {pendingList.map((submission) => (
                      <ActivitySubmissionCard 
                        key={submission.id} 
                        submission={submission} 
                        workspaceSlug={slug}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No submissions under review</h3>
                    <p className="text-gray-500">
                      Your approved and pending submissions will appear here.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Approved Submissions */}
              <TabsContent value="approved" className="space-y-4">
                {approvedList.length > 0 ? (
                  <div className="grid gap-4">
                    {approvedList.map((submission) => (
                      <ActivitySubmissionCard 
                        key={submission.id} 
                        submission={submission} 
                        workspaceSlug={slug}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No approved submissions yet</h3>
                    <p className="text-gray-500">
                      Complete and submit activities to see your approved work here.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Rejected Submissions */}
              <TabsContent value="rejected" className="space-y-4">
                {rejectedList.length > 0 ? (
                  <div className="grid gap-4">
                    {rejectedList.map((submission) => (
                      <ActivitySubmissionCard 
                        key={submission.id} 
                        submission={submission} 
                        workspaceSlug={slug}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No submissions need revision</h3>
                    <p className="text-gray-500">
                      Submissions that need changes will appear here with feedback.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Draft Submissions */}
              <TabsContent value="drafts" className="space-y-4">
                {draftList.length > 0 ? (
                  <div className="grid gap-4">
                    {draftList.map((submission) => (
                      <ActivitySubmissionCard 
                        key={submission.id} 
                        submission={submission} 
                        workspaceSlug={slug}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No draft submissions</h3>
                    <p className="text-gray-500">
                      Save work-in-progress submissions as drafts before submitting.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-coral-100 rounded-lg flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-coral-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Browse Challenges</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Find new challenges to participate in and submit activities
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/w/${slug}/participant/challenges`}>
                      View Challenges
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">View Leaderboard</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    See how you rank among other participants in the workspace
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/w/${slug}/participant/leaderboard`}>
                      View Rankings
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  )
}