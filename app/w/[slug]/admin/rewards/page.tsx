'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, CheckCircle2, Clock, XCircle, RefreshCw, Search, RotateCw, Plus } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { RewardIssuanceDialog } from '@/components/admin/reward-issuance-dialog'
import { RewardIssuanceDetailDialog } from '@/components/admin/reward-issuance-detail-dialog'

interface RewardIssuance {
  id: string
  userId: string
  challengeId: string | null
  amount: number
  status: string
  rewardStackStatus: string | null
  rewardStackTransactionId: string | null
  rewardStackErrorMessage: string | null
  createdAt: string
  issuedAt: string | null
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

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Summary {
  totalCount: number
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

export default function RewardsAdminPage() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const [rewards, setRewards] = useState<RewardIssuance[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [summary, setSummary] = useState<Summary>({ totalCount: 0, byStatus: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rewardStackStatusFilter, setRewardStackStatusFilter] = useState<string>('all')
  const [hasErrorFilter, setHasErrorFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Retry state
  const [selectedRewards, setSelectedRewards] = useState<Set<string>>(new Set())
  const [retrying, setRetrying] = useState(false)

  // Issuance dialog state
  const [issuanceDialogOpen, setIssuanceDialogOpen] = useState(false)

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedReward, setSelectedReward] = useState<RewardIssuance | null>(null)

  const load = async () => {
    if (!params?.slug) return
    setLoading(true)
    setError(null)
    try {
      const page = searchParams.get('page') || '1'
      const queryParams = new URLSearchParams({
        page,
        limit: '50',
      })

      if (statusFilter && statusFilter !== 'all') queryParams.set('status', statusFilter)
      if (rewardStackStatusFilter && rewardStackStatusFilter !== 'all') queryParams.set('rewardStackStatus', rewardStackStatusFilter)
      if (hasErrorFilter && hasErrorFilter !== 'all') queryParams.set('hasError', hasErrorFilter)
      if (searchQuery) queryParams.set('search', searchQuery)

      const res = await fetch(`/api/workspaces/${params.slug}/rewards?${queryParams.toString()}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load rewards')
      }
      const data = await res.json()
      setRewards(data.rewards || [])
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 })
      setSummary(data.summary || { totalCount: 0, byStatus: [] })
    } catch (e: any) {
      setError(e.message || 'Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [params?.slug, searchParams])

  const handlePageChange = (newPage: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(newPage))
    router.push(url.pathname + url.search)
  }

  const handleFilterChange = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', '1') // Reset to page 1 when filtering
    router.push(url.pathname + url.search)
    load()
  }

  const handleRefresh = () => {
    load()
  }

  const handleSelectReward = (rewardId: string, checked: boolean) => {
    const newSelected = new Set(selectedRewards)
    if (checked) {
      newSelected.add(rewardId)
    } else {
      newSelected.delete(rewardId)
    }
    setSelectedRewards(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select only FAILED or PENDING rewards
      const eligibleRewards = rewards
        .filter((r) => r.status === 'FAILED' || r.status === 'PENDING')
        .map((r) => r.id)
      setSelectedRewards(new Set(eligibleRewards))
    } else {
      setSelectedRewards(new Set())
    }
  }

  const handleRetrySelected = async () => {
    if (selectedRewards.size === 0) {
      toast({
        title: 'No rewards selected',
        description: 'Please select at least one reward to retry',
        variant: 'destructive',
      })
      return
    }

    setRetrying(true)
    try {
      const res = await fetch(`/api/workspaces/${params.slug}/rewards/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardIds: Array.from(selectedRewards) }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to retry rewards')
      }

      const data = await res.json()

      toast({
        title: 'Retry Complete',
        description: `Successfully retried ${data.succeeded} of ${data.total} rewards`,
      })

      // Clear selection and reload
      setSelectedRewards(new Set())
      load()
    } catch (e: any) {
      toast({
        title: 'Retry Failed',
        description: e.message || 'Failed to retry rewards',
        variant: 'destructive',
      })
    } finally {
      setRetrying(false)
    }
  }

  const handleRetrySingle = async (rewardId: string) => {
    setRetrying(true)
    try {
      const res = await fetch(`/api/workspaces/${params.slug}/rewards/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardIds: [rewardId] }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to retry reward')
      }

      const data = await res.json()
      const result = data.results?.[0]

      if (result?.success) {
        toast({
          title: 'Retry Initiated',
          description: 'Reward retry has been initiated successfully',
        })
      } else {
        toast({
          title: 'Retry Failed',
          description: result?.error || 'Failed to retry reward',
          variant: 'destructive',
        })
      }

      load()
    } catch (e: any) {
      toast({
        title: 'Retry Failed',
        description: e.message || 'Failed to retry reward',
        variant: 'destructive',
      })
    } finally {
      setRetrying(false)
    }
  }

  const isRewardEligibleForRetry = (reward: RewardIssuance) => {
    return reward.status === 'FAILED' || reward.status === 'PENDING'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
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

  const handleRowClick = (reward: RewardIssuance) => {
    setSelectedReward(reward)
    setDetailDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Reward Management</h1>
          <p className="text-sm text-gray-600">
            Issue and monitor reward distributions to participants
          </p>
        </div>
        <div className="flex gap-2">
          {selectedRewards.size > 0 && (
            <Button
              onClick={handleRetrySelected}
              disabled={retrying}
              variant="default"
              size="sm"
            >
              <RotateCw className={`h-4 w-4 mr-2 ${retrying ? 'animate-spin' : ''}`} />
              Retry Selected ({selectedRewards.size})
            </Button>
          )}
          <Button
            onClick={() => setIssuanceDialogOpen(true)}
            className="bg-coral-500 hover:bg-coral-600"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Issue Reward
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCount}</div>
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter rewards by status, errors, or search by participant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="ISSUED">ISSUED</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rewardstack-status-filter">RewardSTACK Status</Label>
              <Select value={rewardStackStatusFilter} onValueChange={setRewardStackStatusFilter}>
                <SelectTrigger id="rewardstack-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                  <SelectItem value="RETURNED">RETURNED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="error-filter">Errors</Label>
              <Select value={hasErrorFilter} onValueChange={setHasErrorFilter}>
                <SelectTrigger id="error-filter">
                  <SelectValue placeholder="All rewards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rewards</SelectItem>
                  <SelectItem value="true">With errors only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
                />
                <Button onClick={handleFilterChange} size="icon" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reward Issuances</CardTitle>
          <CardDescription>
            {pagination.total} total rewards • Page {pagination.page} of {pagination.totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">Loading rewards...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : rewards.length === 0 ? (
            <div className="text-sm text-gray-500">No rewards found</div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedRewards.size > 0 &&
                            rewards
                              .filter(isRewardEligibleForRetry)
                              .every((r) => selectedRewards.has(r.id))
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead>Challenge</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>RewardSTACK Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.map((reward) => {
                      const canRetry = isRewardEligibleForRetry(reward)
                      return (
                        <TableRow
                          key={reward.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleRowClick(reward)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRewards.has(reward.id)}
                              disabled={!canRetry}
                              onCheckedChange={(checked) =>
                                handleSelectReward(reward.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{getUserDisplay(reward)}</div>
                              <div className="text-xs text-gray-500">{reward.User.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {reward.Challenge ? (
                              <div className="text-sm">{reward.Challenge.title}</div>
                            ) : (
                              <span className="text-gray-400 text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${(reward.amount / 100).toFixed(2)}
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
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canRetry || retrying}
                              onClick={() => handleRetrySingle(reward.id)}
                            >
                              <RotateCw
                                className={`h-4 w-4 mr-1 ${retrying ? 'animate-spin' : ''}`}
                              />
                              Retry
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Error Messages */}
              {rewards.some((r) => r.rewardStackErrorMessage) && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-red-800">Error Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {rewards
                        .filter((r) => r.rewardStackErrorMessage)
                        .map((reward) => (
                          <div key={reward.id} className="text-sm">
                            <span className="font-medium">{getUserDisplay(reward)}:</span>{' '}
                            <span className="text-red-700">{reward.rewardStackErrorMessage}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
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
