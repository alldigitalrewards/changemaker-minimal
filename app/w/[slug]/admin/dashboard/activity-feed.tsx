'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Clock, User, Trophy, Mail, Settings, FileText } from 'lucide-react'
import { quickApproveSubmission, quickRejectSubmission } from './actions'
import { toast } from 'sonner'

interface ActivityFeedProps {
  workspaceId: string
  slug: string
  events: any[]
  pendingSubmissions: any[]
}

export function ActivityFeed({ workspaceId, slug, events, pendingSubmissions }: ActivityFeedProps) {
  const [filter, setFilter] = useState<'all' | 'submissions' | 'enrollments' | 'challenges'>('all')
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  const handleApprove = async (submissionId: string, pointsValue: number) => {
    setProcessing(prev => new Set(prev).add(submissionId))
    try {
      const result = await quickApproveSubmission(submissionId, workspaceId, slug, pointsValue)
      if (result.success) {
        toast.success('Submission approved')
      } else {
        toast.error(result.error || 'Failed to approve submission')
      }
    } finally {
      setProcessing(prev => {
        const next = new Set(prev)
        next.delete(submissionId)
        return next
      })
    }
  }

  const handleReject = async (submissionId: string) => {
    setProcessing(prev => new Set(prev).add(submissionId))
    try {
      const result = await quickRejectSubmission(submissionId, workspaceId, slug)
      if (result.success) {
        toast.success('Submission rejected')
      } else {
        toast.error(result.error || 'Failed to reject submission')
      }
    } finally {
      setProcessing(prev => {
        const next = new Set(prev)
        next.delete(submissionId)
        return next
      })
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ENROLLED':
      case 'UNENROLLED':
        return <User className="h-4 w-4" />
      case 'SUBMISSION_CREATED':
      case 'SUBMISSION_APPROVED':
      case 'SUBMISSION_REJECTED':
        return <FileText className="h-4 w-4" />
      case 'CHALLENGE_CREATED':
      case 'CHALLENGE_UPDATED':
      case 'CHALLENGE_PUBLISHED':
        return <Trophy className="h-4 w-4" />
      case 'INVITE_SENT':
      case 'INVITE_REDEEMED':
        return <Mail className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'SUBMISSION_APPROVED':
      case 'ENROLLED':
      case 'CHALLENGE_PUBLISHED':
        return 'bg-green-100 text-green-800'
      case 'SUBMISSION_REJECTED':
      case 'UNENROLLED':
        return 'bg-red-100 text-red-800'
      case 'SUBMISSION_CREATED':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatEventMessage = (event: any) => {
    const userEmail = event.user?.email || 'Unknown user'
    const actorEmail = event.actor?.email || 'System'
    const challengeTitle = event.challenge?.title || 'a challenge'

    switch (event.type) {
      case 'ENROLLED':
        return `${userEmail} enrolled in ${challengeTitle}`
      case 'UNENROLLED':
        return `${userEmail} unenrolled from ${challengeTitle}`
      case 'SUBMISSION_CREATED':
        return `${userEmail} submitted work for ${challengeTitle}`
      case 'SUBMISSION_APPROVED':
        return `${actorEmail} approved ${userEmail}'s submission`
      case 'SUBMISSION_REJECTED':
        return `${actorEmail} rejected ${userEmail}'s submission`
      case 'CHALLENGE_CREATED':
        return `${actorEmail} created ${challengeTitle}`
      case 'CHALLENGE_UPDATED':
        return `${actorEmail} updated ${challengeTitle}`
      case 'CHALLENGE_PUBLISHED':
        return `${actorEmail} published ${challengeTitle}`
      case 'INVITE_SENT':
        return `${actorEmail} sent an invite`
      case 'INVITE_REDEEMED':
        return `${userEmail} redeemed an invite`
      default:
        return event.type.replace(/_/g, ' ').toLowerCase()
    }
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true
    if (filter === 'submissions') return event.type.includes('SUBMISSION')
    if (filter === 'enrollments') return event.type.includes('ENROLL')
    if (filter === 'challenges') return event.type.includes('CHALLENGE')
    return true
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>Recent workspace activity and pending submissions</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'submissions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('submissions')}
            >
              Submissions
            </Button>
            <Button
              variant={filter === 'enrollments' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('enrollments')}
            >
              Enrollments
            </Button>
            <Button
              variant={filter === 'challenges' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('challenges')}
            >
              Challenges
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] overflow-y-auto pr-4">
          {pendingSubmissions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-coral-600 mb-3">Pending Approvals</h3>
              <div className="space-y-3">
                {pendingSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="p-4 border border-yellow-200 rounded-lg bg-yellow-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {getRelativeTime(submission.submittedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {submission.user.email}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {submission.activity.template.name} - {submission.activity.challenge.title}
                        </p>
                        {submission.textContent && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {submission.textContent}
                          </p>
                        )}
                        {submission.linkUrl && (
                          <a
                            href={submission.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-coral-600 hover:underline mt-1 block"
                          >
                            View submission link
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50 border-green-300"
                          onClick={() => handleApprove(submission.id, submission.activity.pointsValue)}
                          disabled={processing.has(submission.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve ({submission.activity.pointsValue} pts)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 border-red-300"
                          onClick={() => handleReject(submission.id)}
                          disabled={processing.has(submission.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredEvents.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {formatEventMessage(event)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getRelativeTime(event.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
