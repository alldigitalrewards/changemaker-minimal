'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, Clock, CheckCircle2, XCircle, AlertCircle, Eye } from 'lucide-react'
import { RewardIssuanceDetailDialog } from '@/components/admin/reward-issuance-detail-dialog'

interface RewardIssuance {
  id: string
  userId: string
  challengeId: string | null
  amount: number
  status: string
  rewardStackStatus: string | null
  rewardStackTransactionId: string | null
  rewardStackAdjustmentId: string | null
  rewardStackErrorMessage: string | null
  createdAt: string
  issuedAt: string | null
  description: string | null
  type: string
  skuId: string | null
  externalTransactionId: string | null
  externalResponse: any
  error: string | null
  User: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    displayName: string | null
    rewardStackParticipantId: string | null
  }
  Challenge: {
    id: string
    title: string
  } | null
  IssuedByUser?: {
    email: string
    firstName: string | null
    lastName: string | null
  } | null
}

interface RewardIssuancesCardProps {
  userId?: string // For participant view (their own rewards)
  workspaceId: string
  title?: string
  description?: string
  maxDisplay?: number
}

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3 w-3" />,
  ISSUED: <CheckCircle2 className="h-3 w-3" />,
  FAILED: <XCircle className="h-3 w-3" />,
  CANCELLED: <AlertCircle className="h-3 w-3" />,
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ISSUED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

export function RewardIssuancesCard({
  userId,
  workspaceId,
  title = 'Recent Rewards',
  description = 'Your recent reward issuances',
  maxDisplay = 5,
}: RewardIssuancesCardProps) {
  const [rewards, setRewards] = useState<RewardIssuance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReward, setSelectedReward] = useState<RewardIssuance | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Fetch rewards on mount
  useEffect(() => {
    async function fetchRewards() {
      try {
        const params = new URLSearchParams({
          limit: maxDisplay.toString(),
          ...(userId && { userId }),
        })

        // Extract workspace slug from the current URL or use a prop
        const slug = window.location.pathname.split('/')[2]
        const response = await fetch(`/api/workspaces/${slug}/rewards?${params}`)

        if (!response.ok) throw new Error('Failed to fetch rewards')

        const data = await response.json()
        setRewards(data.rewards || [])
      } catch (error) {
        console.error('Error fetching rewards:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRewards()
  }, [userId, maxDisplay])

  const handleViewDetails = (reward: RewardIssuance) => {
    setSelectedReward(reward)
    setDetailDialogOpen(true)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-900" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">No rewards issued yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => handleViewDetails(reward)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          ${(reward.amount / 100).toFixed(2)}
                        </span>
                        <Badge className={statusColors[reward.status] || 'bg-gray-100 text-gray-800'}>
                          <span className="flex items-center gap-1">
                            {statusIcons[reward.status]}
                            {reward.status}
                          </span>
                        </Badge>
                      </div>
                      {reward.Challenge && (
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {reward.Challenge.title}
                        </p>
                      )}
                      {reward.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {reward.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(reward.issuedAt || reward.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetails(reward)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RewardIssuanceDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        reward={selectedReward}
      />
    </>
  )
}
