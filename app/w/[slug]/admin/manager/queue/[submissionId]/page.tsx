import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, User, Calendar, FileText, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrentWorkspace } from '@/lib/workspace-context'
import { requireAuth } from '@/lib/auth/api-auth'
import { getUserWorkspaceRole } from '@/lib/workspace-context'
import { ManagerReviewForm } from './review-form'

interface PageProps {
  params: Promise<{ slug: string; submissionId: string }>
}

export default async function SubmissionReviewPage({ params }: PageProps) {
  const { slug, submissionId } = await params

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

  // Fetch submission details from API
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/workspaces/${slug}/submissions/${submissionId}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      notFound()
    }
    // For other errors, redirect to queue
    redirect(`/w/${slug}/admin/manager/queue`)
  }

  const { submission } = await response.json()

  if (!submission) {
    notFound()
  }

  // Check if this is the user's own submission (self-approval prevention)
  const isOwnSubmission = submission.userId === dbUser.id

  // Determine status badge styling
  const statusBadges: Record<string, { className: string; label: string }> = {
    PENDING: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending Review' },
    MANAGER_APPROVED: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Pending Admin' },
    NEEDS_REVISION: { className: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Needs Revision' },
    APPROVED: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Approved' },
    REJECTED: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' },
  }

  const statusBadge = statusBadges[submission.status] || {
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    label: submission.status,
  }

  const challengeTitle = submission.Activity?.Challenge?.title || 'Unknown Challenge'
  const activityName = submission.Activity?.ActivityTemplate?.name || 'Unknown Activity'
  const activityDescription = submission.Activity?.ActivityTemplate?.description || ''
  const basePoints = submission.Activity?.ActivityTemplate?.basePoints || 0
  const userEmail = submission.User?.email || 'Unknown User'
  const userName = submission.User?.firstName && submission.User?.lastName
    ? `${submission.User.firstName} ${submission.User.lastName}`
    : userEmail

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href={`/w/${slug}/admin/manager/queue`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Queue
        </Button>
      </Link>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">{challengeTitle}</CardTitle>
              <CardDescription className="mt-1 text-base">
                {activityName}
              </CardDescription>
            </div>
            <Badge variant="outline" className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{userName}</div>
                <div className="text-xs text-muted-foreground">{userEmail}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Submitted</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Point Value</div>
                <div className="text-xs text-muted-foreground">{basePoints} points</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Details */}
      {activityDescription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {activityDescription}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submission Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {submission.textContent && (
            <div>
              <h4 className="text-sm font-medium mb-2">Text Response</h4>
              <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                {submission.textContent}
              </div>
            </div>
          )}

          {submission.linkUrl && (
            <div>
              <h4 className="text-sm font-medium mb-2">Link</h4>
              <a
                href={submission.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-coral-600 hover:text-coral-700 underline"
              >
                {submission.linkUrl}
              </a>
            </div>
          )}

          {submission.fileUrls && submission.fileUrls.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Attachments</h4>
              <div className="space-y-2">
                {submission.fileUrls.map((url: string, index: number) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-coral-600 hover:text-coral-700 underline"
                  >
                    <FileText className="h-4 w-4" />
                    Attachment {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {!submission.textContent && !submission.linkUrl && (!submission.fileUrls || submission.fileUrls.length === 0) && (
            <div className="text-sm text-muted-foreground">
              No submission content provided.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Manager Notes (if any) */}
      {submission.managerNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previous Manager Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {submission.managerNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Self-Approval Warning */}
      {isOwnSubmission && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-900">Cannot Review Own Submission</h4>
                <p className="text-sm text-amber-700 mt-1">
                  You cannot approve or reject your own submissions. Please ask another manager or admin to review this submission.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {submission.status === 'PENDING' && !isOwnSubmission && (
        <ManagerReviewForm
          submissionId={submission.id}
          workspaceSlug={slug}
          challengeTitle={challengeTitle}
          activityName={activityName}
        />
      )}

      {/* Already Reviewed Message */}
      {submission.status !== 'PENDING' && !isOwnSubmission && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              This submission has already been reviewed and is currently <strong>{statusBadge.label.toLowerCase()}</strong>.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disabled Review Form for Own Submissions */}
      {submission.status === 'PENDING' && isOwnSubmission && (
        <Card className="opacity-50 pointer-events-none">
          <CardHeader>
            <CardTitle className="text-base">Review Submission</CardTitle>
            <CardDescription>This form is disabled because you cannot review your own submission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Review functionality is not available for your own submissions.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
