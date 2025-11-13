'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { AlertCircle, CheckCircle2, Clock, XCircle, RefreshCw, ChevronDown, ChevronRight, ExternalLink, Copy, Check, AlertTriangle, Gift, DollarSign } from 'lucide-react'
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

export default function ParticipantRewardsPage() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

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

  const handleRefresh = () => {
    load()
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
    } catch (error) {
      // Silent fail for copy
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">My Rewards</h1>
          <p className="text-sm text-gray-600">
            View your reward history and transaction details
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
                <Gift className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Value Card */}
        {(() => {
          const totalValue = summary.byStatus.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
          return (
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-700 mb-1">Total Value</div>
                    <div className="text-3xl font-bold text-blue-900">
                      ${(totalValue / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      All rewards combined
                    </div>
                  </div>
                  <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

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

      {/* Filter Row */}
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

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Rewards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reward History</CardTitle>
          <CardDescription>
            {pagination.total} total rewards • Page {pagination.page} of {pagination.totalPages || 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">Loading rewards...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Gift className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards yet</h3>
              <p className="text-sm text-gray-600">
                Participate in challenges, complete activities to earn rewards!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Challenge</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.map((reward) => {
                      const isExpanded = expandedRows.has(reward.id)
                      return (
                        <>
                          <TableRow
                            key={reward.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleRowExpanded(reward.id)}
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </TableCell>
                            <TableCell>
                              {reward.Challenge ? (
                                <div className="text-sm font-medium">{reward.Challenge.title}</div>
                              ) : reward.description ? (
                                <div className="text-sm font-medium text-gray-700">{reward.description}</div>
                              ) : (
                                <span className="text-gray-400 text-sm">Manual Reward</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              ${(reward.amount / 100).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {reward.type === 'sku' ? 'Catalog' : 'Points'}
                              </Badge>
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
                                onClick={() => handleViewDetails(reward)}
                                title="View full details"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expandable Row Details */}
                          {isExpanded && (
                            <TableRow key={`${reward.id}-expanded`}>
                              <TableCell colSpan={8} className="bg-gray-50 border-t">
                                <div className="py-4 px-2 space-y-4">
                                  {/* Main Details Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                                    {/* Transaction Info */}
                                    <div>
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Transaction Info
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
                                            <span className="font-medium">Transaction ID:</span>{' '}
                                            <div
                                              className="flex items-center gap-1 group cursor-pointer mt-1"
                                              onClick={(e) => copyTransactionId(reward.rewardStackTransactionId!, e)}
                                              title="Click to copy"
                                            >
                                              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                                {reward.rewardStackTransactionId}
                                              </code>
                                              {copiedId === reward.rewardStackTransactionId ? (
                                                <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                              ) : (
                                                <Copy className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Shipping Address for SKU Rewards */}
                                  {reward.type === 'sku' && reward.externalResponse?.shipping && (
                                    <div className="border-t border-gray-200 pt-3">
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Shipping Address
                                      </div>
                                      <div className="bg-white rounded border border-gray-200 p-3">
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
                                      <div className="text-xs text-red-600 mt-2">
                                        Please contact support if this issue persists.
                                      </div>
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

      {/* Reward Issuance Detail Dialog */}
      <RewardIssuanceDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        reward={selectedReward}
      />
    </div>
  )
}
