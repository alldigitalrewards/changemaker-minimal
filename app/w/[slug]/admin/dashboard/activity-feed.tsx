'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Clock, User, Trophy, Mail, Settings, FileText, Paperclip, ExternalLink } from 'lucide-react'
import { quickApproveSubmission, quickRejectSubmission } from './actions'
import { toast } from 'sonner'
import Link from 'next/link'

interface ActivityFeedProps {
  workspaceId: string
  slug: string
  events: any[]
  pendingSubmissions: any[]
}

export function ActivityFeed({ workspaceId, slug, events, pendingSubmissions }: ActivityFeedProps) {
  const [filter, setFilter] = useState<'all' | 'submissions' | 'enrollments' | 'challenges'>('all')
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [queue, setQueue] = useState(pendingSubmissions)

  useEffect(() => {
    setQueue(pendingSubmissions)
  }, [pendingSubmissions])

  const handleApprove = async (submissionId: string, pointsValue: number) => {
    setProcessing(prev => new Set(prev).add(submissionId))
    try {
      const result = await quickApproveSubmission(submissionId, workspaceId, slug, pointsValue)
      if (result.success) {
        toast.success('Submission approved')
        setQueue(prev => prev.filter(submission => submission.id !== submissionId))
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
        setQueue(prev => prev.filter(submission => submission.id !== submissionId))
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
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Filter Activity</h3>
        <div className="inline-flex gap-1 p-1 bg-gray-100 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-coral-500 hover:bg-coral-600 text-white' : 'hover:bg-gray-200'}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('submissions')}
              className={filter === 'submissions' ? 'bg-coral-500 hover:bg-coral-600 text-white' : 'hover:bg-gray-200'}
            >
              Submissions
              {queue.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold bg-amber-400 text-white rounded">
                  {queue.length}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('enrollments')}
              className={filter === 'enrollments' ? 'bg-coral-500 hover:bg-coral-600 text-white' : 'hover:bg-gray-200'}
            >
              Enrollments
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('challenges')}
              className={filter === 'challenges' ? 'bg-coral-500 hover:bg-coral-600 text-white' : 'hover:bg-gray-200'}
            >
              Challenges
            </Button>
          </div>
      </div>

      {/* Activity Content */}
      <div className="h-[500px] overflow-y-auto pr-2">
          {queue.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-coral-600 mb-3">Pending Approvals</h3>
              <div className="space-y-3">
                {queue.map((submission) => (
                  <div
                    key={submission.id}
                    className="group p-4 border border-amber-200 rounded-lg bg-gradient-to-br from-amber-50 to-white hover:shadow-md transition-all"
                  >
                    <div className="space-y-3">
                      {/* Header - Time and Points */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-white border-amber-300 text-amber-700">
                            <Clock className="h-3 w-3 mr-1" />
                            {getRelativeTime(submission.submittedAt)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-coral-100 rounded-md">
                          <Trophy className="h-3.5 w-3.5 text-coral-600" />
                          <span className="text-sm font-bold text-coral-700">
                            {submission.activity.pointsValue}
                          </span>
                        </div>
                      </div>

                      {/* Participant & Challenge Info */}
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {submission.user.email}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {submission.activity.template.name} • {submission.activity.challenge.title}
                        </p>
                      </div>

                      {/* Content Preview */}
                      {submission.textContent && (
                        <div className="p-2.5 bg-white rounded border border-gray-200">
                          <p className="text-xs text-gray-700 line-clamp-2">
                            {submission.textContent}
                          </p>
                        </div>
                      )}

                      {/* Attachments */}
                      {(submission.linkUrl || submission.fileUrls?.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                          {submission.linkUrl && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                              <a href={submission.linkUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Link
                              </a>
                            </Button>
                          )}
                          {submission.fileUrls?.map((url: string, index: number) => (
                            <Button key={`${submission.id}-file-${index}`} variant="outline" size="sm" className="h-7 text-xs" asChild>
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                <Paperclip className="h-3 w-3 mr-1" />
                                File {index + 1}
                              </a>
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9"
                          onClick={() => handleApprove(submission.id, submission.activity.pointsValue)}
                          disabled={processing.has(submission.id)}
                        >
                          <Check className="h-4 w-4 mr-1.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-9"
                          onClick={() => handleReject(submission.id)}
                          disabled={processing.has(submission.id)}
                        >
                          <X className="h-4 w-4 mr-1.5" />
                          Reject
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 px-3" asChild>
                          <Link href={`/w/${slug}/admin/challenges/${submission.activity.challengeId}/submissions?status=pending`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
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
    </div>
  )
}
