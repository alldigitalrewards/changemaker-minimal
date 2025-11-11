'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
import { AlertCircle, CheckCircle2, Clock, XCircle, RefreshCw, Search, RotateCw, Plus, ChevronDown, ChevronRight, ExternalLink, Copy, Check, AlertTriangle } from 'lucide-react'
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

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Copy state for transaction IDs
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  // Debounced search handler
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.set('page', '1')
      if (value) {
        url.searchParams.set('search', value)
      } else {
        url.searchParams.delete('search')
      }
      router.push(url.pathname + url.search)
    }, 300)
  }, [router])

  // Real-time filter updates
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    const url = new URL(window.location.href)
    url.searchParams.set('page', '1')
    if (value !== 'all') {
      url.searchParams.set('status', value)
    } else {
      url.searchParams.delete('status')
    }
    router.push(url.pathname + url.search)
  }

  const handleRewardStackStatusFilterChange = (value: string) => {
    setRewardStackStatusFilter(value)
    const url = new URL(window.location.href)
    url.searchParams.set('page', '1')
    if (value !== 'all') {
      url.searchParams.set('rewardStackStatus', value)
    } else {
      url.searchParams.delete('rewardStackStatus')
    }
    router.push(url.pathname + url.search)
  }

  const handleHasErrorFilterChange = (value: string) => {
    setHasErrorFilter(value)
    const url = new URL(window.location.href)
    url.searchParams.set('page', '1')
    if (value !== 'all') {
      url.searchParams.set('hasError', value)
    } else {
      url.searchParams.delete('hasError')
    }
    router.push(url.pathname + url.search)
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

  const toggleRowExpanded = (rewardId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(rewardId)) {
      newExpanded.delete(rewardId)
    } else {
      newExpanded.add(rewardId)
    }
    setExpandedRows(newExpanded)
  }

  const handleViewDetails = (reward: RewardIssuance) => {
    setSelectedReward(reward)
    setDetailDialogOpen(true)
  }

  const copyTransactionId = async (transactionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(transactionId)
      setCopiedId(transactionId)
      setTimeout(() => setCopiedId(null), 2000)
      toast({
        title: 'Copied',
        description: 'Transaction ID copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy transaction ID',
        variant: 'destructive',
      })
    }
  }

  const clearAllFilters = () => {
    setStatusFilter('all')
    setRewardStackStatusFilter('all')
    setHasErrorFilter('all')
    setSearchQuery('')
    const url = new URL(window.location.href)
    url.searchParams.set('page', '1')
    url.searchParams.delete('status')
    url.searchParams.delete('rewardStackStatus')
    url.searchParams.delete('hasError')
    url.searchParams.delete('search')
    router.push(url.pathname + url.search)
  }

  const hasActiveFilters = statusFilter !== 'all' || rewardStackStatusFilter !== 'all' || hasErrorFilter !== 'all' || searchQuery !== ''

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
            className="bg-gray-900 hover:bg-gray-800"
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

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Rewards Card */}
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Total Rewards</div>
                <div className="text-3xl font-bold text-gray-900">{summary.totalCount}</div>
              </div>
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issued Card */}
        {(() => {
          const issuedStat = summary.byStatus.find((s) => s.status === 'ISSUED')
          return (
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-700 mb-1">Issued</div>
                    <div className="text-3xl font-bold text-green-900">
                      {issuedStat?.count || 0}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      ${((issuedStat?.totalAmount || 0) / 100).toFixed(2)} total
                    </div>
                  </div>
                  <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Failed Card */}
        {(() => {
          const failedStat = summary.byStatus.find((s) => s.status === 'FAILED')
          return (
            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-red-700 mb-1">Failed</div>
                    <div className="text-3xl font-bold text-red-900">
                      {failedStat?.count || 0}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      ${((failedStat?.totalAmount || 0) / 100).toFixed(2)} total
                    </div>
                  </div>
                  <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Pending Card */}
        {(() => {
          const pendingStat = summary.byStatus.find((s) => s.status === 'PENDING')
          return (
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-amber-700 mb-1">Pending</div>
                    <div className="text-3xl font-bold text-amber-900">
                      {pendingStat?.count || 0}
                    </div>
                    <div className="text-xs text-amber-600 mt-1">
                      ${((pendingStat?.totalAmount || 0) / 100).toFixed(2)} total
                    </div>
                  </div>
                  <div className="h-12 w-12 bg-amber-500 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Smart Filters Row */}
      <div className="flex flex-wrap gap-3 items-center bg-white border rounded-lg p-4">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ISSUED">✓ Issued</SelectItem>
            <SelectItem value="FAILED">✗ Failed</SelectItem>
            <SelectItem value="PENDING">⏱ Pending</SelectItem>
            <SelectItem value="CANCELLED">⊘ Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={rewardStackStatusFilter} onValueChange={handleRewardStackStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="RewardSTACK Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All RewardSTACK</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hasErrorFilter} onValueChange={handleHasErrorFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Rewards" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rewards</SelectItem>
            <SelectItem value="true">⚠ Errors Only</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Filtering...</span>
          </div>
        )}
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Status: {statusFilter}
              <button
                onClick={() => handleStatusFilterChange('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {rewardStackStatusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              RewardSTACK: {rewardStackStatusFilter}
              <button
                onClick={() => handleRewardStackStatusFilterChange('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {hasErrorFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Errors Only
              <button
                onClick={() => handleHasErrorFilterChange('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: "{searchQuery}"
              <button
                onClick={() => handleSearchChange('')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
          >
            Clear All Filters
          </Button>
        </div>
      )}

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
                      <TableHead>Transaction ID</TableHead>
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
                      const isExpanded = expandedRows.has(reward.id)
                      return (
                        <>
                          <TableRow
                            key={reward.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleRowExpanded(reward.id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                                <Checkbox
                                  checked={selectedRewards.has(reward.id)}
                                  disabled={!canRetry}
                                  onCheckedChange={(checked) =>
                                    handleSelectReward(reward.id, checked as boolean)
                                  }
                                />
                              </div>
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
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {reward.rewardStackTransactionId ? (
                                <div
                                  className="flex items-center gap-1 group cursor-pointer"
                                  onClick={(e) => copyTransactionId(reward.rewardStackTransactionId!, e)}
                                  title="Click to copy"
                                >
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono max-w-[120px] truncate block">
                                    {reward.rewardStackTransactionId}
                                  </code>
                                  {copiedId === reward.rewardStackTransactionId ? (
                                    <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  {statusIcons[reward.status]}
                                  {reward.status === 'FAILED' && (reward.error || reward.rewardStackErrorMessage) && (
                                    <div
                                      className="absolute -top-1 -right-1 group"
                                      title={reward.rewardStackErrorMessage || reward.error || ''}
                                    >
                                      <AlertTriangle className="h-3 w-3 text-red-600 fill-red-100" />
                                    </div>
                                  )}
                                </div>
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
                              <div className="flex gap-1">
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(reward)}
                                  title="View full details"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expandable Row Details */}
                          {isExpanded && (
                            <TableRow key={`${reward.id}-expanded`}>
                              <TableCell colSpan={10} className="bg-gray-50 border-t">
                                <div className="py-4 px-2 space-y-4">
                                  {/* Main Details Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Participant Info */}
                                    <div>
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Participant
                                      </div>
                                      <div className="space-y-1.5">
                                        <div className="text-xs">
                                          <span className="font-medium">Name:</span>{' '}
                                          <span className="text-gray-600">{getUserDisplay(reward)}</span>
                                        </div>
                                        <div className="text-xs">
                                          <span className="font-medium">Email:</span>{' '}
                                          <span className="text-gray-600">{reward.User.email}</span>
                                        </div>
                                        {reward.User.rewardStackParticipantId && (
                                          <div className="text-xs">
                                            <span className="font-medium">RS ID:</span>{' '}
                                            <code className="text-gray-600 font-mono text-[10px]">
                                              {reward.User.rewardStackParticipantId.slice(0, 8)}...
                                            </code>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Challenge & Timing */}
                                    <div>
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Challenge & Timing
                                      </div>
                                      <div className="space-y-1.5">
                                        {reward.Challenge ? (
                                          <div className="text-xs">
                                            <span className="font-medium">Challenge:</span>{' '}
                                            <span className="text-gray-600">{reward.Challenge.title}</span>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-400">No challenge</div>
                                        )}
                                        <div className="text-xs">
                                          <span className="font-medium">Created:</span>{' '}
                                          <span className="text-gray-600">{formatDate(reward.createdAt)}</span>
                                        </div>
                                        {reward.issuedAt && (
                                          <div className="text-xs">
                                            <span className="font-medium">Issued:</span>{' '}
                                            <span className="text-gray-600">{formatDate(reward.issuedAt)}</span>
                                          </div>
                                        )}
                                        {reward.IssuedByUser && (
                                          <div className="text-xs">
                                            <span className="font-medium">Issued By:</span>{' '}
                                            <span className="text-gray-600">
                                              {reward.IssuedByUser.firstName && reward.IssuedByUser.lastName
                                                ? `${reward.IssuedByUser.firstName} ${reward.IssuedByUser.lastName}`
                                                : reward.IssuedByUser.email}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Reward Details */}
                                    <div>
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Reward Details
                                      </div>
                                      <div className="space-y-1.5">
                                        <div className="text-xs">
                                          <span className="font-medium">Type:</span>{' '}
                                          <Badge variant="secondary" className="ml-1">
                                            {reward.type === 'sku' ? 'Catalog' : 'Points'}
                                          </Badge>
                                        </div>
                                        <div className="text-xs">
                                          <span className="font-medium">Amount:</span>{' '}
                                          <span className="text-gray-900 font-semibold">
                                            ${(reward.amount / 100).toFixed(2)}
                                          </span>
                                        </div>
                                        {reward.skuId && (
                                          <div className="text-xs">
                                            <span className="font-medium">SKU:</span>{' '}
                                            <code className="text-gray-600 font-mono text-[10px]">
                                              {reward.skuId}
                                            </code>
                                          </div>
                                        )}
                                        {reward.description && (
                                          <div className="text-xs">
                                            <span className="font-medium">Note:</span>{' '}
                                            <span className="text-gray-600">{reward.description}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* RewardSTACK IDs */}
                                    <div>
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        RewardSTACK IDs
                                      </div>
                                      <div className="space-y-1.5">
                                        {reward.rewardStackStatus && (
                                          <div className="text-xs">
                                            <span className="font-medium">Status:</span>{' '}
                                            <Badge
                                              className={rewardStackStatusColors[reward.rewardStackStatus] || ''}
                                              variant="secondary"
                                            >
                                              {reward.rewardStackStatus}
                                            </Badge>
                                          </div>
                                        )}
                                        {reward.rewardStackTransactionId && (
                                          <div className="text-xs">
                                            <span className="font-medium">Transaction:</span>{' '}
                                            <a
                                              href={`https://app.rewardstack.io/transactions/${reward.rewardStackTransactionId}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-gray-900 hover:text-gray-800 underline font-mono inline-flex items-center gap-1 text-[10px]"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {reward.rewardStackTransactionId}
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          </div>
                                        )}
                                        {reward.rewardStackAdjustmentId && (
                                          <div className="text-xs">
                                            <span className="font-medium">Adjustment:</span>{' '}
                                            <code className="text-gray-600 font-mono text-[10px]">
                                              {reward.rewardStackAdjustmentId}
                                            </code>
                                          </div>
                                        )}
                                        {reward.externalTransactionId && (
                                          <div className="text-xs">
                                            <span className="font-medium">External ID:</span>{' '}
                                            <code className="text-gray-600 font-mono text-[10px]">
                                              {reward.externalTransactionId}
                                            </code>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Additional Details for SKU Rewards */}
                                  {reward.type === 'sku' && reward.externalResponse && (
                                    <div className="border-t border-gray-200 pt-3">
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Catalog Order Details
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Shipping Info */}
                                        {reward.externalResponse.shipping && (
                                          <div className="bg-white rounded border border-gray-200 p-2">
                                            <div className="text-xs font-medium text-gray-700 mb-1">
                                              Shipping Address
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-0.5">
                                              {reward.externalResponse.shipping.firstname && reward.externalResponse.shipping.lastname && (
                                                <div>
                                                  {reward.externalResponse.shipping.firstname} {reward.externalResponse.shipping.lastname}
                                                </div>
                                              )}
                                              {reward.externalResponse.shipping.address1 && (
                                                <div>{reward.externalResponse.shipping.address1}</div>
                                              )}
                                              {reward.externalResponse.shipping.address2 && (
                                                <div>{reward.externalResponse.shipping.address2}</div>
                                              )}
                                              <div>
                                                {reward.externalResponse.shipping.city && `${reward.externalResponse.shipping.city}, `}
                                                {reward.externalResponse.shipping.state && `${reward.externalResponse.shipping.state} `}
                                                {reward.externalResponse.shipping.zip}
                                              </div>
                                              {reward.externalResponse.shipping.country && (
                                                <div>{reward.externalResponse.shipping.country}</div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Additional Metadata */}
                                        <div className="bg-white rounded border border-gray-200 p-2">
                                          <div className="text-xs font-medium text-gray-700 mb-1">
                                            Order Information
                                          </div>
                                          <div className="text-xs space-y-1">
                                            {reward.externalResponse.points && (
                                              <div>
                                                <span className="font-medium">Points Issued:</span>{' '}
                                                <span className="text-green-700 font-semibold">
                                                  {reward.externalResponse.points}
                                                </span>
                                              </div>
                                            )}
                                            {reward.externalResponse.description && (
                                              <div>
                                                <span className="font-medium">Description:</span>{' '}
                                                <span className="text-gray-600">
                                                  {reward.externalResponse.description}
                                                </span>
                                              </div>
                                            )}
                                            {reward.externalResponse.created_at && (
                                              <div>
                                                <span className="font-medium">RS Created:</span>{' '}
                                                <span className="text-gray-600">
                                                  {new Date(reward.externalResponse.created_at).toLocaleString()}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Error Details */}
                                  {(reward.rewardStackErrorMessage || reward.error) && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                      <div className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                                        <XCircle className="h-4 w-4" />
                                        Error Details
                                      </div>
                                      <div className="text-xs text-red-700">
                                        {reward.rewardStackErrorMessage || reward.error}
                                      </div>
                                      {canRetry && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="mt-2 text-xs h-7"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleRetrySingle(reward.id)
                                          }}
                                          disabled={retrying}
                                        >
                                          <RotateCw className={`h-3 w-3 mr-1 ${retrying ? 'animate-spin' : ''}`} />
                                          Retry Now
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
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
