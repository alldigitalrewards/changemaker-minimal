'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Activity, RefreshCw, ExternalLink } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface WebhookLog {
  id: string
  eventType: string
  payload: any
  receivedAt: string
  processed: boolean
  processedAt: string | null
  error: string | null
}

interface RewardWebhookLogsProps {
  rewardId: string
  workspaceSlug: string
}

const eventTypeColors: Record<string, string> = {
  'transaction.created': 'bg-blue-100 text-blue-800',
  'transaction.completed': 'bg-green-100 text-green-800',
  'transaction.failed': 'bg-red-100 text-red-800',
  'adjustment.created': 'bg-purple-100 text-purple-800',
  'adjustment.completed': 'bg-green-100 text-green-800',
  'adjustment.failed': 'bg-red-100 text-red-800',
  'participant.created': 'bg-cyan-100 text-cyan-800',
  'participant.updated': 'bg-blue-100 text-blue-800',
}

export function RewardWebhookLogs({ rewardId, workspaceSlug }: RewardWebhookLogsProps) {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/rewards/${rewardId}/webhook-logs`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch webhook logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err) {
      console.error('Error fetching webhook logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch webhook logs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [rewardId, workspaceSlug])

  const toggleLogExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Webhook Event History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Loading webhook events...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <XCircle className="h-4 w-4" />
            Error Loading Webhook Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Webhook Event History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <Clock className="h-8 w-8 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">No webhook events received yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Events will appear here when RewardSTACK sends status updates
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2 max-w-md">
              <p className="text-xs text-blue-800">
                Webhooks notify you when transaction statuses change. Configure webhook endpoints in your
                RewardSTACK settings to receive real-time updates.
              </p>
              <a
                href="https://docs.rewardstack.io/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 underline mt-2 inline-flex items-center gap-1"
              >
                Learn more about webhooks
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Webhook Event History ({logs.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log, index) => {
            const isExpanded = expandedLogs.has(log.id)
            const isLast = index === logs.length - 1

            return (
              <div key={log.id} className="relative">
                {/* Timeline connector */}
                {!isLast && (
                  <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200" />
                )}

                <Collapsible>
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className="flex-shrink-0 mt-1">
                      {log.processed ? (
                        log.error ? (
                          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                        )
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-yellow-600" />
                        </div>
                      )}
                    </div>

                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={eventTypeColors[log.eventType] || 'bg-gray-100 text-gray-800'}
                              variant="secondary"
                            >
                              {log.eventType}
                            </Badge>
                            {log.error && (
                              <Badge variant="destructive" className="text-xs">
                                Processing Error
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(log.receivedAt)}
                          </p>
                        </div>

                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLogExpanded(log.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent>
                        <div className="mt-3 space-y-3 bg-gray-50 p-3 rounded-md border border-gray-200">
                          {/* Processing status */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Processed:</span>
                              <span className="ml-1 font-medium">
                                {log.processed ? 'Yes' : 'No'}
                              </span>
                            </div>
                            {log.processedAt && (
                              <div>
                                <span className="text-gray-500">Processed At:</span>
                                <span className="ml-1 font-medium">
                                  {formatDate(log.processedAt)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Error details */}
                          {log.error && (
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <p className="text-xs font-medium text-red-800 mb-1">
                                Processing Error:
                              </p>
                              <p className="text-xs text-red-700">{log.error}</p>
                            </div>
                          )}

                          {/* Payload details */}
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Event Data:</p>
                            <div className="bg-white border border-gray-200 rounded p-2 max-h-48 overflow-auto">
                              <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </div>
                </Collapsible>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
