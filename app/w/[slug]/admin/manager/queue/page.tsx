import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, ClipboardList, XCircle, Briefcase } from 'lucide-react'
import { getCurrentWorkspace } from '@/lib/workspace-context'
import { requireAuth } from '@/lib/auth/api-auth'
import { getUserWorkspaceRole } from '@/lib/workspace-context'
import { ManagerReviewButton } from './manager-review-button'
import { prisma } from '@/lib/prisma'

type FilterKey = 'PENDING' | 'MANAGER_APPROVED' | 'NEEDS_REVISION' | 'ALL'

const FILTERS: { key: FilterKey; label: string; description: string }[] = [
  { key: 'PENDING', label: 'Pending', description: 'Awaiting your review' },
  { key: 'MANAGER_APPROVED', label: 'Approved', description: 'Pending admin approval' },
  { key: 'NEEDS_REVISION', label: 'Needs Revision', description: 'Requested changes' },
  { key: 'ALL', label: 'All', description: 'Complete history' },
]

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ status?: string }>
}

export default async function ManagerQueuePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = (await (searchParams || Promise.resolve({} as any))) as { status?: string }

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

  // Determine status filter
  const rawStatus = typeof sp?.status === 'string' ? sp.status.toUpperCase() : ''
  const allowedFilters: FilterKey[] = ['PENDING', 'MANAGER_APPROVED', 'NEEDS_REVISION', 'ALL']
  const statusFilter: FilterKey = allowedFilters.includes(rawStatus as FilterKey) ? (rawStatus as FilterKey) : 'PENDING'

  // Get all challenges assigned to this manager
  const assignments = await prisma.challengeAssignment.findMany({
    where: {
      managerId: dbUser.id,
      workspaceId: workspace.id,
    },
    select: { challengeId: true },
  })

  const assignedChallengeIds = assignments.map((a) => a.challengeId)

  // Build query with optional status filter
  const whereClause: any = {
    Activity: {
      challengeId: { in: assignedChallengeIds },
    },
  }

  if (statusFilter !== 'ALL') {
    whereClause.status = statusFilter
  }

  // Get submissions for assigned challenges
  const submissions = assignedChallengeIds.length > 0
    ? await prisma.activitySubmission.findMany({
        where: whereClause,
        include: {
          User: {
            select: { id: true, email: true },
          },
          Activity: {
            include: {
              ActivityTemplate: {
                select: { id: true, name: true, type: true },
              },
              Challenge: {
                select: { id: true, title: true, workspaceId: true },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      })
    : []

  // Calculate stats
  const statusCounts = {
    PENDING: 0,
    MANAGER_APPROVED: 0,
    NEEDS_REVISION: 0,
  }

  const challenges = new Set<string>()
  let approvedToday = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  submissions.forEach((submission: any) => {
    if (submission.status === 'PENDING') statusCounts.PENDING++
    if (submission.status === 'MANAGER_APPROVED') {
      statusCounts.MANAGER_APPROVED++
      if (submission.managerReviewedAt && new Date(submission.managerReviewedAt) >= today) {
        approvedToday++
      }
    }
    if (submission.status === 'NEEDS_REVISION') statusCounts.NEEDS_REVISION++
    if (submission.Activity?.Challenge?.id) {
      challenges.add(submission.Activity.Challenge.id)
    }
  })

  const totalAssignedChallenges = challenges.size

  // Calculate average review time for manager-approved submissions
  let avgReviewTime = 0
  const reviewedSubmissions = submissions.filter((s: any) =>
    s.status === 'MANAGER_APPROVED' && s.managerReviewedAt && s.submittedAt
  )
  if (reviewedSubmissions.length > 0) {
    const totalTime = reviewedSubmissions.reduce((sum: number, s: any) => {
      const submitted = new Date(s.submittedAt).getTime()
      const reviewed = new Date(s.managerReviewedAt).getTime()
      return sum + (reviewed - submitted)
    }, 0)
    avgReviewTime = Math.round(totalTime / reviewedSubmissions.length / (1000 * 60 * 60)) // hours
  }

  const oldestPending = submissions
    .filter((s: any) => s.status === 'PENDING')
    .sort((a: any, b: any) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())[0]

  const filterHref = (key: FilterKey) => {
    if (key === 'PENDING') {
      return `/w/${slug}/admin/manager/queue`
    }
    return `/w/${slug}/admin/manager/queue?status=${key.toLowerCase()}`
  }

  const statusBadges: Record<string, { className: string; label: string }> = {
    PENDING: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending Review' },
    MANAGER_APPROVED: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Pending Admin' },
    NEEDS_REVISION: { className: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Needs Revision' },
    APPROVED: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Approved' },
    REJECTED: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' },
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList className="h-5 w-5 text-gray-900" />
              Manager Review Queue
            </CardTitle>
            <CardDescription>Review submissions for your assigned challenges</CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {submissions.length} submissions
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pending Reviews</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-amber-600">{statusCounts.PENDING}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {oldestPending
                  ? `Oldest: ${formatDistanceToNow(new Date(oldestPending.submittedAt), { addSuffix: true })}`
                  : 'No pending'}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Approved Today</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-green-600">{approvedToday}</p>
              <p className="mt-1 text-xs text-muted-foreground">Since midnight</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Avg Review Time</span>
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-purple-600">
                {avgReviewTime > 0 ? `${avgReviewTime}h` : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {reviewedSubmissions.length > 0 ? `Based on ${reviewedSubmissions.length} reviews` : 'No data yet'}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Assigned Challenges</span>
                <Briefcase className="h-4 w-4 text-gray-900" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{totalAssignedChallenges}</p>
              <p className="mt-1 text-xs text-muted-foreground">Active assignments</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Filter submissions by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <Link key={filter.key} href={filterHref(filter.key)}>
                <Button
                  variant={statusFilter === filter.key ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                >
                  <span>{filter.label}</span>
                  {filter.key !== 'ALL' && (
                    <Badge variant={statusFilter === filter.key ? 'secondary' : 'outline'} className="text-xs">
                      {statusCounts[filter.key as keyof typeof statusCounts]}
                    </Badge>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No submissions found</h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'PENDING'
                  ? 'There are no pending submissions to review at this time.'
                  : 'No submissions match the selected filter.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission: any) => {
            const statusBadge = statusBadges[submission.status] || { className: '', label: submission.status }
            const challengeTitle = submission.Activity?.Challenge?.title || 'Unknown Challenge'
            const challengeId = submission.Activity?.Challenge?.id || ''
            const activityName = submission.Activity?.ActivityTemplate?.name || 'Unknown Activity'
            const userEmail = submission.User?.email || 'Unknown User'
            const submissionUserId = submission.User?.id || ''

            return (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">
                        {challengeTitle} • {activityName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Submitted by: {userEmail}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={statusBadge.className}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Submitted {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/w/${slug}/admin/challenges/${challengeId}/submissions`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {submission.status === 'PENDING' && (
                        <ManagerReviewButton
                          submissionId={submission.id}
                          submissionUserId={submissionUserId}
                          currentUserId={dbUser.id}
                          workspaceSlug={slug}
                          challengeId={challengeId}
                          challengeTitle={challengeTitle}
                          activityName={activityName}
                          userEmail={userEmail}
                        />
                      )}
                    </div>
                  </div>
                  {submission.managerNotes && (
                    <div className="mt-3 rounded-md bg-muted p-3">
                      <p className="text-sm text-muted-foreground">
                        <strong>Manager Notes:</strong> {submission.managerNotes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
