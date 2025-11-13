import { notFound } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Award,
  CheckCircle,
  ClipboardList,
  Clock,
  FileText,
  Link2 as LinkIcon,
  Mail,
  Paperclip,
  XCircle,
} from 'lucide-react'
import { SubmissionReviewButton } from '../submission-review-button'

type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type FilterKey = SubmissionStatus | 'ALL'

const FILTERS: { key: FilterKey; label: string; description: string }[] = [
  { key: 'PENDING', label: 'Pending', description: 'Awaiting review' },
  { key: 'APPROVED', label: 'Approved', description: 'Awarded submissions' },
  { key: 'REJECTED', label: 'Rejected', description: 'Declined submissions' },
  { key: 'ALL', label: 'All', description: 'Complete submission history' },
]

interface PageProps {
  params: Promise<{ slug: string; id: string }>
  searchParams?: Promise<{ status?: string }>
}

export default async function ChallengeSubmissionsPage({ params, searchParams }: PageProps) {
  const { slug, id } = await params
  const sp = (await (searchParams || Promise.resolve({} as any))) as { status?: string }

  const challenge = await prisma.challenge.findFirst({
    where: { id, Workspace: { slug } },
    select: { id: true, title: true },
  })

  if (!challenge) {
    notFound()
  }

  const rawStatus = typeof sp?.status === 'string' ? sp.status.toUpperCase() : ''
  const allowedFilters: FilterKey[] = ['PENDING', 'APPROVED', 'REJECTED', 'ALL']
  const statusFilter: FilterKey = allowedFilters.includes(rawStatus as FilterKey) ? (rawStatus as FilterKey) : 'PENDING'
  const statusWhere = statusFilter !== 'ALL' ? { status: statusFilter as SubmissionStatus } : {}

  const [statusStats, submissions, oldestPending] = await Promise.all([
    prisma.activitySubmission.groupBy({
      by: ['status'],
      where: { Activity: { challengeId: challenge.id } },
      _count: true,
    }),
    prisma.activitySubmission.findMany({
      where: {
        Activity: { challengeId: challenge.id },
        ...statusWhere,
      },
      orderBy: statusFilter === 'PENDING' ? { submittedAt: 'asc' } : { submittedAt: 'desc' },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
          }
        },
        Activity: {
          include: {
            ActivityTemplate: {
              select: {
                name: true,
                type: true,
                requiresApproval: true,
              },
            },
          },
        },
      },
    }),
    prisma.activitySubmission.findFirst({
      where: {
        Activity: { challengeId: challenge.id },
        status: 'PENDING',
      },
      orderBy: { submittedAt: 'asc' },
      select: { submittedAt: true },
    }),
  ])

  const statusCounts: Record<SubmissionStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  }

  statusStats.forEach((stat) => {
    const status = stat.status as SubmissionStatus
    if (statusCounts[status] !== undefined) {
      statusCounts[status] = stat._count
    }
  })

  const totalSubmissions = Object.values(statusCounts).reduce((sum, value) => sum + value, 0)

  const statusBadges: Record<SubmissionStatus, { className: string; label: string; icon: typeof Clock }> = {
    PENDING: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending', icon: Clock },
    APPROVED: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Approved', icon: CheckCircle },
    REJECTED: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected', icon: XCircle },
  }

  const filterHref = (key: FilterKey) => {
    if (key === 'PENDING') {
      return `/w/${slug}/admin/challenges/${id}/submissions`
    }
    return `/w/${slug}/admin/challenges/${id}/submissions?status=${key.toLowerCase()}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList className="h-5 w-5 text-gray-900" />
              Submission Queue
            </CardTitle>
            <CardDescription>Review recent activity submissions for {challenge.title}</CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {totalSubmissions} total submissions
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pending approvals</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-amber-600">{statusCounts.PENDING}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {oldestPending
                  ? `Oldest pending for ${formatDistanceToNow(new Date(oldestPending.submittedAt), { addSuffix: true })}`
                  : 'No queue backlog'}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Approved</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-green-600">{statusCounts.APPROVED}</p>
              <p className="mt-1 text-xs text-muted-foreground">All time approvals</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Rejected</span>
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-red-600">{statusCounts.REJECTED}</p>
              <p className="mt-1 text-xs text-muted-foreground">Requires follow-up</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Average points value</span>
                <Award className="h-4 w-4 text-purple-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-purple-600">
                {submissions.length
                  ? Math.round(
                      submissions.reduce((sum, submission) => sum + submission.Activity.pointsValue, 0) /
                        submissions.length,
                    )
                  : 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Across visible submissions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Select a view to focus the queue</CardDescription>
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
                      {statusCounts[filter.key as SubmissionStatus]}
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
            <CardHeader className="text-center">
              <CardTitle className="text-lg font-semibold">
                {statusFilter === 'PENDING' ? 'No pending submissions' : 'No submissions to display'}
              </CardTitle>
              <CardDescription>
                {statusFilter === 'PENDING'
                  ? 'Great work! New submissions will appear here as soon as participants submit activities.'
                  : 'Try a different filter or encourage participants to submit more activities.'}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          submissions.map((submission) => {
            const config = statusBadges[submission.status as SubmissionStatus]
            const StatusIcon = config.icon

            return (
              <Card key={submission.id} className="border shadow-sm transition hover:shadow-md">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {submission.Activity.ActivityTemplate.name || 'Activity Submission'}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-gray-900" />
                        {submission.User.email}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-green-600" />
                        Submitted {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(submission.submittedAt), 'MMM d, yyyy • h:mm a')}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`${config.className} flex items-center gap-1 text-xs`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {submission.Activity.pointsValue} pts
                    </Badge>
                    {submission.Activity.ActivityTemplate.requiresApproval && (
                      <Badge variant="outline" className="text-xs">
                        Requires approval
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                    <div className="space-y-3">
                      {submission.textContent && (
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <FileText className="h-4 w-4 text-gray-900" />
                            Text Response
                          </div>
                          <p className="mt-1 whitespace-pre-line rounded-md border bg-muted/30 p-3 text-sm text-gray-800">
                            {submission.textContent}
                          </p>
                        </div>
                      )}
                      {submission.linkUrl && (
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <LinkIcon className="h-4 w-4 text-blue-500" />
                            Submitted Link
                          </div>
                          <a
                            href={submission.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            {submission.linkUrl}
                          </a>
                        </div>
                      )}
                      {submission.fileUrls.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Paperclip className="h-4 w-4 text-purple-500" />
                            Attachments
                          </div>
                          <ul className="mt-1 space-y-1">
                            {submission.fileUrls.map((url, index) => (
                              <li key={`${submission.id}-file-${index}`}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-purple-600 hover:underline"
                                >
                                  View file {index + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!submission.textContent && !submission.linkUrl && submission.fileUrls.length === 0 && (
                        <p className="text-sm text-muted-foreground">No additional submission details provided.</p>
                      )}
                    </div>
                    <div className="flex flex-col justify-between gap-4">
                      {submission.reviewNotes && submission.status !== 'PENDING' && (
                        <div className="rounded-md border bg-muted/30 p-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <ClipboardList className="h-4 w-4 text-blue-500" />
                            Review notes
                          </div>
                          <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{submission.reviewNotes}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {submission.status === 'PENDING' ? (
                          <>
                            <SubmissionReviewButton
                              submissionId={submission.id}
                              action="approve"
                              workspaceSlug={slug}
                              challengeId={id}
                              pointsValue={submission.Activity.pointsValue}
                            />
                            <SubmissionReviewButton
                              submissionId={submission.id}
                              action="reject"
                              workspaceSlug={slug}
                              challengeId={id}
                              pointsValue={submission.Activity.pointsValue}
                            />
                          </>
                        ) : (
                          submission.pointsAwarded !== null && (
                            <Badge variant="outline" className="text-xs text-green-700">
                              Awarded {submission.pointsAwarded} pts
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
