import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  Clock,
  ClipboardList,
  TrendingUp,
  Briefcase,
  ArrowRight
} from 'lucide-react'
import { getCurrentWorkspace } from '@/lib/workspace-context'
import { requireAuth } from '@/lib/auth/api-auth'
import { getUserWorkspaceRole } from '@/lib/workspace-context'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ManagerDashboardPage({ params }: PageProps) {
  const { slug } = await params

  // Get current user and verify authorization
  const { dbUser } = await requireAuth()
  const workspace = await getCurrentWorkspace(slug)

  if (!workspace) {
    notFound()
  }

  // Verify user has manager or admin role
  const role = await getUserWorkspaceRole(slug)
  if (role !== 'MANAGER' && role !== 'ADMIN') {
    notFound()
  }

  // Get all challenges assigned to this manager
  const assignments = await prisma.challengeAssignment.findMany({
    where: {
      managerId: dbUser.id,
      workspaceId: workspace.id,
    },
    select: { challengeId: true },
  })

  const assignedChallengeIds = assignments.map((a) => a.challengeId)

  // Get submissions for assigned challenges
  const submissions = assignedChallengeIds.length > 0
    ? await prisma.activitySubmission.findMany({
        where: {
          Activity: {
            challengeId: { in: assignedChallengeIds },
          },
        },
        include: {
          User: {
            select: { id: true, email: true },
          },
          Activity: {
            include: {
              ActivityTemplate: {
                select: { id: true, name: true },
              },
              Challenge: {
                select: { id: true, title: true },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      })
    : []

  // Calculate stats
  const pendingCount = submissions.filter((s: any) => s.status === 'PENDING').length
  const managerApprovedCount = submissions.filter((s: any) => s.status === 'MANAGER_APPROVED').length
  const needsRevisionCount = submissions.filter((s: any) => s.status === 'NEEDS_REVISION').length

  // Calculate approved today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const approvedToday = submissions.filter(
    (s: any) => s.status === 'MANAGER_APPROVED' && s.managerReviewedAt && new Date(s.managerReviewedAt) >= today
  ).length

  // Calculate average review time for manager-approved submissions
  let avgReviewTime = 0
  const reviewedSubmissions = submissions.filter(
    (s: any) => s.status === 'MANAGER_APPROVED' && s.managerReviewedAt && s.submittedAt
  )
  if (reviewedSubmissions.length > 0) {
    const totalTime = reviewedSubmissions.reduce((sum: number, s: any) => {
      const submitted = new Date(s.submittedAt).getTime()
      const reviewed = new Date(s.managerReviewedAt).getTime()
      return sum + (reviewed - submitted)
    }, 0)
    avgReviewTime = Math.round(totalTime / reviewedSubmissions.length / (1000 * 60 * 60)) // hours
  }

  // Get total unique challenges with submissions
  const challengesWithSubmissions = new Set<string>()
  submissions.forEach((s: any) => {
    if (s.Activity?.Challenge?.id) {
      challengesWithSubmissions.add(s.Activity.Challenge.id)
    }
  })

  // Get recent reviews (last 5)
  const recentReviews = submissions
    .filter((s: any) => s.managerReviewedAt)
    .sort((a: any, b: any) => new Date(b.managerReviewedAt).getTime() - new Date(a.managerReviewedAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve submissions for your assigned challenges
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting your review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Since midnight
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Review Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {avgReviewTime > 0 ? `${avgReviewTime}h` : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {reviewedSubmissions.length > 0 ? `Based on ${reviewedSubmissions.length} reviews` : 'No data yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Challenges</CardTitle>
            <Briefcase className="h-4 w-4 text-coral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-coral-600">{assignedChallengeIds.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {challengesWithSubmissions.size} with submissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Navigate to common manager tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href={`/w/${slug}/admin/manager/queue`}>
              <Button className="bg-coral-500 hover:bg-coral-600">
                <ClipboardList className="mr-2 h-4 w-4" />
                Go to Review Queue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {pendingCount > 0 && (
              <Link href={`/w/${slug}/admin/manager/queue?status=pending`}>
                <Button variant="outline">
                  Review {pendingCount} Pending
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reviews</CardTitle>
          <CardDescription>Your last 5 submission reviews</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReviews.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No reviews yet. Start by reviewing pending submissions.
            </div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((submission: any) => {
                const challengeTitle = submission.Activity?.Challenge?.title || 'Unknown Challenge'
                const activityName = submission.Activity?.ActivityTemplate?.name || 'Unknown Activity'
                const userEmail = submission.User?.email || 'Unknown User'
                const statusColor = submission.status === 'MANAGER_APPROVED'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-orange-100 text-orange-800 border-orange-200'
                const statusLabel = submission.status === 'MANAGER_APPROVED'
                  ? 'Approved'
                  : 'Needs Revision'

                return (
                  <div
                    key={submission.id}
                    className="flex items-start justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {challengeTitle} • {activityName}
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {userEmail} • Reviewed {formatDistanceToNow(new Date(submission.managerReviewedAt), { addSuffix: true })}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColor}>
                      {statusLabel}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Admin Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{managerApprovedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Revision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{needsRevisionCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{submissions.length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
