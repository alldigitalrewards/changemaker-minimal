'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Clock, XCircle, User, Trophy, Calendar, DollarSign, Activity } from 'lucide-react'
import { RewardWebhookLogs } from './reward-webhook-logs'
import { useParams } from 'next/navigation'

interface RewardIssuance {
  id: string
  userId: string
  challengeId: string | null
  amount: number | null
  status: string
  rewardStackStatus: string | null
  rewardStackTransactionId: string | null
  rewardStackAdjustmentId: string | null
  rewardStackErrorMessage: string | null
  externalResponse: any
  createdAt: string | Date
  issuedAt: string | Date | null
  description: string | null
  type: string
  skuId: string | null
  externalTransactionId: string | null
  error: string | null
  User: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    displayName: string | null
    rewardStackParticipantId: string | null
  }
  Challenge?: {
    id: string
    title: string
  } | null
  IssuedByUser?: {
    email: string
    firstName: string | null
    lastName: string | null
  } | null
}

interface RewardIssuanceDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reward: RewardIssuance | null
}

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-yellow-500" />,
  ISSUED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  CANCELLED: <AlertCircle className="h-4 w-4 text-gray-500" />,
}

const rewardStackStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-gray-100 text-gray-800',
}

export function RewardIssuanceDetailDialog({
  open,
  onOpenChange,
  reward,
}: RewardIssuanceDetailDialogProps) {
  const params = useParams<{ slug: string }>()

  if (!reward) return null

  const getUserDisplay = () => {
    if (reward.User.displayName) return reward.User.displayName
    if (reward.User.firstName && reward.User.lastName) {
      return `${reward.User.firstName} ${reward.User.lastName}`
    }
    return reward.User.email
  }

  const getIssuedByDisplay = () => {
    if (!reward.IssuedByUser) return 'System'
    if (reward.IssuedByUser.firstName && reward.IssuedByUser.lastName) {
      return `${reward.IssuedByUser.firstName} ${reward.IssuedByUser.lastName}`
    }
    return reward.IssuedByUser.email
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-'
    const dateObj = new Date(date)
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reward Issuance Details</DialogTitle>
          <DialogDescription>
            Complete information about this reward issuance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Issuance Status</span>
                <div className="flex items-center gap-2">
                  {statusIcons[reward.status]}
                  <Badge variant="outline">{reward.status}</Badge>
                </div>
              </div>
              {reward.rewardStackStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">RewardSTACK Status</span>
                  <Badge
                    className={rewardStackStatusColors[reward.rewardStackStatus] || ''}
                    variant="secondary"
                  >
                    {reward.rewardStackStatus}
                  </Badge>
                </div>
              )}
              {reward.rewardStackTransactionId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Transaction ID</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {reward.rewardStackTransactionId}
                  </code>
                </div>
              )}
              {reward.rewardStackAdjustmentId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Adjustment ID</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {reward.rewardStackAdjustmentId}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Participant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Name</span>
                <span className="font-medium">{getUserDisplay()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email</span>
                <span className="text-sm">{reward.User.email}</span>
              </div>
              {reward.User.rewardStackParticipantId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">RewardSTACK ID</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {reward.User.rewardStackParticipantId}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reward Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Reward Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Type</span>
                <Badge variant="outline">{reward.type || 'POINTS'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Amount</span>
                <span className="font-mono font-medium text-lg">
                  ${((reward.amount ?? 0) / 100).toFixed(2)}
                </span>
              </div>
              {reward.skuId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">SKU ID</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{reward.skuId}</code>
                </div>
              )}
              {reward.description && (
                <div className="pt-2">
                  <span className="text-sm text-gray-600 block mb-1">Description</span>
                  <p className="text-sm bg-gray-50 p-2 rounded">{reward.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Challenge Info */}
          {reward.Challenge && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Challenge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Title</span>
                  <span className="font-medium">{reward.Challenge.title}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm">{formatDate(reward.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Issued</span>
                <span className="text-sm">{formatDate(reward.issuedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Issued By</span>
                <span className="text-sm">{getIssuedByDisplay()}</span>
              </div>
            </CardContent>
          </Card>

          {/* RewardSTACK API Response */}
          {reward.externalResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  RewardSTACK API Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-3 rounded-lg overflow-auto max-h-96">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(reward.externalResponse, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Webhook Event History */}
          {params?.slug && (
            <RewardWebhookLogs rewardId={reward.id} workspaceSlug={params.slug} />
          )}

          {/* Error Messages */}
          {(reward.error || reward.rewardStackErrorMessage) && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {reward.error && (
                  <div>
                    <span className="text-sm font-medium text-red-700 block mb-1">
                      Issuance Error
                    </span>
                    <p className="text-sm text-red-600 bg-white p-2 rounded">{reward.error}</p>
                  </div>
                )}
                {reward.rewardStackErrorMessage && (
                  <div>
                    <span className="text-sm font-medium text-red-700 block mb-1">
                      RewardSTACK Error
                    </span>
                    <p className="text-sm text-red-600 bg-white p-2 rounded">
                      {reward.rewardStackErrorMessage}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
