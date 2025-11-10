'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, CheckCircle2, XCircle, AlertCircle, DollarSign, Trophy, Settings, Plus } from 'lucide-react'
import { RewardIssuanceDialog } from '@/components/admin/reward-issuance-dialog'
import { RewardIssuanceDetailDialog } from '@/components/admin/reward-issuance-detail-dialog'
import type { RewardIssuance as PrismaRewardIssuance, Challenge } from '@prisma/client'

type RewardIssuance = PrismaRewardIssuance & {
  User: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    displayName: string | null
  }
  Challenge?: Challenge | null
}

interface Summary {
  totalCount: number
  totalAmount: number
  byStatus: Array<{
    status: string
    count: number
    totalAmount: number
  }>
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

export default function ChallengeRewardsPage() {
  const params = useParams<{ slug: string; id: string }>()
  const [rewards, setRewards] = useState<RewardIssuance[]>([])
  const [summary, setSummary] = useState<Summary>({ totalCount: 0, totalAmount: 0, byStatus: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issuanceDialogOpen, setIssuanceDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedReward, setSelectedReward] = useState<RewardIssuance | null>(null)

  const load = async () => {
    if (!params?.slug || !params?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/workspaces/${params.slug}/rewards?challengeId=${params.id}&limit=50`
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load rewards')
      }
      const data = await res.json()
      setRewards(data.rewards || [])

      // Calculate summary
      const totalAmount = (data.rewards || []).reduce((sum: number, r: RewardIssuance) => sum + (r.amount ?? 0), 0)
      const byStatus = data.summary?.byStatus || []
      setSummary({
        totalCount: data.rewards?.length || 0,
        totalAmount,
        byStatus,
      })
    } catch (e: any) {
      setError(e.message || 'Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [params?.slug, params?.id])

  const handleRowClick = (reward: RewardIssuance) => {
    setSelectedReward(reward)
    setDetailDialogOpen(true)
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getUserDisplay = (reward: RewardIssuance) => {
    const { User } = reward
    if (User.firstName && User.lastName) {
      return `${User.firstName} ${User.lastName}`
    }
    return User.email
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Challenge Rewards</h1>
          <p className="text-sm text-gray-600">
            Manage and monitor reward issuances for this challenge via RewardSTACK
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIssuanceDialogOpen(true)}
            className="bg-coral-500 hover:bg-coral-600"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Issue Reward
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-coral-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Total Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCount}</div>
            <div className="text-xs text-gray-500">
              ${(summary.totalAmount / 100).toFixed(2)} total
            </div>
          </CardContent>
        </Card>

        {summary.byStatus.map((stat) => (
          <Card key={stat.status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                {statusIcons[stat.status]}
                {stat.status}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-xs text-gray-500">
                ${(stat.totalAmount / 100).toFixed(2)} total
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RewardSTACK Integration Status */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-green-600" />
                RewardSTACK Integration
              </CardTitle>
              <CardDescription>
                This challenge is integrated with RewardSTACK for automated reward processing
              </CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Provider:</span>
              <span className="ml-2 font-medium">RewardSTACK</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium text-green-600">Connected</span>
            </div>
            <div>
              <span className="text-gray-600">Webhook:</span>
              <span className="ml-2 font-medium text-green-600">Configured</span>
            </div>
            <div>
              <span className="text-gray-600">Auto-Sync:</span>
              <span className="ml-2 font-medium text-green-600">Enabled</span>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">
              Rewards are automatically synced with RewardSTACK. Status updates are received via webhooks in real-time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reward Issuances</CardTitle>
              <CardDescription>
                All reward issuances for this challenge
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">Loading rewards...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards issued yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Get started by issuing rewards to participants for completing challenge activities.
              </p>
              <Button
                onClick={() => setIssuanceDialogOpen(true)}
                className="bg-coral-500 hover:bg-coral-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Issue First Reward
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>RewardSTACK Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Issued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((reward) => (
                    <TableRow
                      key={reward.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(reward)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{getUserDisplay(reward)}</div>
                          <div className="text-xs text-gray-500">{reward.User.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${((reward.amount ?? 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusIcons[reward.status]}
                          <Badge variant="outline">{reward.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reward.rewardStackStatus ? (
                          <Badge
                            className={
                              rewardStackStatusColors[reward.rewardStackStatus] || ''
                            }
                            variant="secondary"
                          >
                            {reward.rewardStackStatus}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(reward.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(reward.issuedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward Issuance Dialog */}
      <RewardIssuanceDialog
        open={issuanceDialogOpen}
        onOpenChange={setIssuanceDialogOpen}
        onSuccess={load}
      />

      {/* Reward Issuance Detail Dialog */}
      <RewardIssuanceDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        reward={selectedReward}
      />
    </div>
  )
}
