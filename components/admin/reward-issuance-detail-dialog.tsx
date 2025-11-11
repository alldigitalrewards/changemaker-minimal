'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Clock, XCircle, User, Trophy, Calendar, DollarSign, Activity, ChevronDown, ChevronUp, RefreshCw, Edit, ExternalLink, Truck, Package, Copy, Check } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState as useActionState } from 'react'
import { useToast } from '@/hooks/use-toast'
import ReactJson from 'react-json-view'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

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
  const [showRawJson, setShowRawJson] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const { toast } = useToast()

  if (!reward) return null

  const copyAddressToClipboard = async () => {
    if (!reward.externalResponse?.shipping) return

    const shipping = reward.externalResponse.shipping
    const addressText = `${shipping.firstname} ${shipping.lastname}
${shipping.company ? shipping.company + '\n' : ''}${shipping.address1}
${shipping.address2 ? shipping.address2 + '\n' : ''}${shipping.city}, ${shipping.state} ${shipping.zip}
${formatCountryCode(shipping.country)}
${shipping.phone ? 'Phone: ' + shipping.phone : ''}
${shipping.email ? 'Email: ' + shipping.email : ''}`.trim()

    try {
      await navigator.clipboard.writeText(addressText)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
      toast({
        title: 'Address Copied',
        description: 'Shipping address copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy address to clipboard',
        variant: 'destructive',
      })
    }
  }

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const response = await fetch(
        `/api/workspaces/${params.slug}/rewards/${reward.id}/retry`,
        { method: 'POST' }
      )

      if (!response.ok) throw new Error('Retry failed')

      toast({
        title: 'Transaction Retry Initiated',
        description: 'The reward transaction has been queued for retry.',
      })

      // Refresh after a delay
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      toast({
        title: 'Retry Failed',
        description: 'Unable to retry the transaction. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRetrying(false)
    }
  }

  const openRewardStackDashboard = () => {
    if (reward.rewardStackTransactionId) {
      window.open(`https://dashboard.rewardstack.io/transactions/${reward.rewardStackTransactionId}`, '_blank')
    }
  }

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

  const formatCountryCode = (code: string | number) => {
    const countryMap: Record<string, string> = {
      '840': 'United States',
      'US': 'United States',
      'USA': 'United States',
      '124': 'Canada',
      'CA': 'Canada',
    }
    return countryMap[String(code)] || String(code)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reward Issuance Details</DialogTitle>
          <DialogDescription>
            Complete information about this reward issuance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Messages - Show first if present */}
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

          {/* Status Banner */}
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">Issuance Status</div>
                  <div className="flex items-center gap-2">
                    {statusIcons[reward.status]}
                    <Badge variant="outline" className="text-sm">{reward.status}</Badge>
                  </div>
                </div>
                {reward.rewardStackStatus && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">RewardSTACK Status</div>
                    <Badge
                      className={rewardStackStatusColors[reward.rewardStackStatus] || ''}
                      variant="secondary"
                    >
                      {reward.rewardStackStatus}
                    </Badge>
                  </div>
                )}
                {reward.rewardStackTransactionId && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">Transaction ID</div>
                    <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                      {reward.rewardStackTransactionId}
                    </code>
                  </div>
                )}
                {reward.rewardStackAdjustmentId && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">Adjustment ID</div>
                    <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                      {reward.rewardStackAdjustmentId}
                    </code>
                  </div>
                )}
                {reward.externalTransactionId && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">External Transaction ID</div>
                    <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                      {reward.externalTransactionId}
                    </code>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Details Grid - 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Participant Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Participant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Name</div>
                  <div className="font-medium">{getUserDisplay()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Email</div>
                  <div className="text-sm">{reward.User.email}</div>
                </div>
                {reward.User.rewardStackParticipantId && (
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">RewardSTACK Participant ID</div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono block break-all">
                      {reward.User.rewardStackParticipantId}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reward Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Reward Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Type</div>
                  <Badge variant="outline">{reward.type || 'POINTS'}</Badge>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Amount</div>
                  <div className="font-mono font-bold text-lg text-green-700">
                    ${((reward.amount ?? 0) / 100).toFixed(2)}
                  </div>
                </div>
                {reward.skuId && (
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">SKU ID</div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono block break-all">
                      {reward.skuId}
                    </code>
                  </div>
                )}
                {reward.description && (
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">Description</div>
                    <p className="text-sm bg-gray-50 p-2 rounded border">{reward.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline & Challenge */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline & Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Created</div>
                  <div className="text-sm">{formatDate(reward.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Issued</div>
                  <div className="text-sm">{formatDate(reward.issuedAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Issued By</div>
                  <div className="text-sm">{getIssuedByDisplay()}</div>
                </div>
                {reward.Challenge && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600 mb-0.5 flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      Challenge
                    </div>
                    <div className="font-medium text-sm">{reward.Challenge.title}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Panel - Context-aware based on status */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-700" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {/* Retry button for failed rewards */}
                {reward.status === 'FAILED' && (
                  <Button
                    onClick={handleRetry}
                    disabled={retrying}
                    size="sm"
                    className="bg-gray-900 hover:bg-gray-800"
                  >
                    {retrying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry Transaction
                      </>
                    )}
                  </Button>
                )}

                {/* View in RewardSTACK */}
                {reward.rewardStackTransactionId && (
                  <Button
                    onClick={openRewardStackDashboard}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in RewardSTACK
                  </Button>
                )}

                {/* Edit participant link */}
                <Button
                  onClick={() => window.location.href = `/w/${params.slug}/admin/participants/${reward.userId}`}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Participant
                </Button>
              </div>

              {/* Troubleshooting for failed rewards */}
              {reward.status === 'FAILED' && (reward.error || reward.rewardStackErrorMessage) && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-xs font-semibold text-amber-800 mb-2">
                    💡 Resolution Steps
                  </div>
                  <div className="text-xs text-amber-900 space-y-1">
                    {(reward.error || reward.rewardStackErrorMessage || '').toLowerCase().includes('address') && (
                      <>
                        <p>• Verify participant shipping address is complete and valid</p>
                        <p>• Ensure state code is a valid 2-letter abbreviation</p>
                        <p>• Check that all required address fields are filled</p>
                      </>
                    )}
                    {(reward.error || reward.rewardStackErrorMessage || '').toLowerCase().includes('participant') && (
                      <>
                        <p>• Participant may not exist in RewardSTACK</p>
                        <p>• Try syncing the participant first</p>
                      </>
                    )}
                    {(reward.error || reward.rewardStackErrorMessage || '').toLowerCase().includes('balance') && (
                      <>
                        <p>• Check program balance in RewardSTACK</p>
                        <p>• Verify sufficient funds are available</p>
                      </>
                    )}
                    <p className="mt-2 font-medium">After fixing the issue, use "Retry Transaction" above.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Catalog Order Details - Only for SKU rewards */}
          {reward.type === 'sku' && reward.externalResponse && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-700" />
                  Catalog Order Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shipping Address */}
                  {reward.externalResponse.shipping && (
                    <div className="bg-white rounded-lg border border-blue-300 p-3">
                      <div className="text-sm font-semibold text-gray-800 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Shipping Address
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyAddressToClipboard}
                          className="h-7 px-2"
                        >
                          {copiedAddress ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div className="font-medium">
                          {reward.externalResponse.shipping.firstname}{' '}
                          {reward.externalResponse.shipping.lastname}
                        </div>
                        {reward.externalResponse.shipping.company && (
                          <div>{reward.externalResponse.shipping.company}</div>
                        )}
                        {reward.externalResponse.shipping.address1 && (
                          <div>{reward.externalResponse.shipping.address1}</div>
                        )}
                        {reward.externalResponse.shipping.address2 && (
                          <div>{reward.externalResponse.shipping.address2}</div>
                        )}
                        <div>
                          {reward.externalResponse.shipping.city}
                          {reward.externalResponse.shipping.state && `, ${reward.externalResponse.shipping.state}`}
                          {reward.externalResponse.shipping.zip && ` ${reward.externalResponse.shipping.zip}`}
                        </div>
                        {reward.externalResponse.shipping.country && (
                          <div className="font-medium">
                            {formatCountryCode(reward.externalResponse.shipping.country)}
                            {reward.externalResponse.shipping.country_code &&
                             reward.externalResponse.shipping.country_code !== reward.externalResponse.shipping.country && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({reward.externalResponse.shipping.country_code})
                              </span>
                            )}
                          </div>
                        )}
                        {reward.externalResponse.shipping.phone && (
                          <div className="text-xs text-gray-600 mt-1">
                            Phone: {reward.externalResponse.shipping.phone}
                          </div>
                        )}
                        {reward.externalResponse.shipping.email && (
                          <div className="text-xs text-gray-600">
                            Email: {reward.externalResponse.shipping.email}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Information */}
                  <div className="bg-white rounded-lg border border-blue-300 p-3">
                    <div className="text-sm font-semibold text-gray-800 mb-2">
                      Order Information
                    </div>
                    <div className="text-sm space-y-2">
                      {reward.externalResponse.points && (
                        <div>
                          <span className="text-gray-600">Points Issued:</span>{' '}
                          <span className="font-bold text-green-700 text-base">
                            {reward.externalResponse.points}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.status && (
                        <div>
                          <span className="text-gray-600">Order Status:</span>{' '}
                          <Badge variant="outline" className="ml-1">
                            {reward.externalResponse.status}
                          </Badge>
                        </div>
                      )}
                      {reward.externalResponse.unique_id && (
                        <div>
                          <span className="text-gray-600">Order ID:</span>{' '}
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {reward.externalResponse.unique_id}
                          </code>
                        </div>
                      )}
                      {reward.externalResponse.subtotal && (
                        <div>
                          <span className="text-gray-600">Subtotal:</span>{' '}
                          <span className="text-gray-800 font-mono">
                            {reward.externalResponse.subtotal} pts
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.wholesale && (
                        <div>
                          <span className="text-gray-600">Wholesale Cost:</span>{' '}
                          <span className="text-gray-800 font-mono">
                            {reward.externalResponse.wholesale} pts
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.trackingNumber && (
                        <div>
                          <span className="text-gray-600">Tracking Number:</span>{' '}
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {reward.externalResponse.trackingNumber}
                          </code>
                        </div>
                      )}
                      {reward.externalResponse.carrier && (
                        <div>
                          <span className="text-gray-600">Carrier:</span>{' '}
                          <span className="text-gray-800">{reward.externalResponse.carrier}</span>
                        </div>
                      )}
                      {reward.externalResponse.estimatedDelivery && (
                        <div>
                          <span className="text-gray-600">Estimated Delivery:</span>{' '}
                          <span className="text-gray-800">
                            {formatDate(reward.externalResponse.estimatedDelivery)}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.createdAt && (
                        <div>
                          <span className="text-gray-600">Order Created:</span>{' '}
                          <span className="text-gray-800">
                            {formatDate(reward.externalResponse.createdAt)}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.email_address && (
                        <div>
                          <span className="text-gray-600">Email:</span>{' '}
                          <span className="text-gray-800 text-xs">
                            {reward.externalResponse.email_address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Timeline & Status Indicators */}
                <div className="mt-4 border-t border-blue-200 pt-3">
                  <div className="text-sm font-semibold text-gray-800 mb-2">
                    Order Timeline & Status
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Timeline */}
                    <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2 text-xs">
                      {reward.externalResponse.created_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span className="text-gray-800">
                            {formatDate(reward.externalResponse.created_at)}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.updated_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Updated:</span>
                          <span className="text-gray-800">
                            {formatDate(reward.externalResponse.updated_at)}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.shipped_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shipped:</span>
                          <span className="text-gray-800 font-medium">
                            {formatDate(reward.externalResponse.shipped_at)}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.delivered_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivered:</span>
                          <span className="text-gray-800 font-medium text-green-700">
                            {formatDate(reward.externalResponse.delivered_at)}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.reissue_date && (
                        <div className="flex justify-between border-t pt-2 mt-2">
                          <span className="text-gray-600">Reissued:</span>
                          <span className="text-amber-700 font-medium">
                            {formatDate(reward.externalResponse.reissue_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="bg-white border border-blue-200 rounded-lg p-3 flex flex-wrap gap-2 items-start content-start">
                      {reward.externalResponse.terms_approved !== undefined && (
                        <div className="flex items-center gap-1">
                          {reward.externalResponse.terms_approved === 1 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Terms Approved
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Terms Pending
                            </Badge>
                          )}
                        </div>
                      )}
                      {reward.externalResponse.is_wallet_enabled !== undefined && (
                        <div className="flex items-center gap-1">
                          {reward.externalResponse.is_wallet_enabled === 1 ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Wallet Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Wallet Disabled
                            </Badge>
                          )}
                        </div>
                      )}
                      {reward.externalResponse.is_digital !== undefined && reward.externalResponse.is_digital === 1 && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                          Digital Delivery
                        </Badge>
                      )}
                      {reward.externalResponse.reissue_date && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Reissued Order
                        </Badge>
                      )}
                      {reward.externalResponse.transaction_source && (
                        <Badge variant="outline" className="text-xs">
                          Source: {reward.externalResponse.transaction_source}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Details - Show items from products array */}
                {reward.externalResponse.products && reward.externalResponse.products.length > 0 && (
                  <div className="mt-4 border-t border-blue-200 pt-3">
                    <div className="text-sm font-semibold text-gray-800 mb-2">
                      Product Details
                    </div>
                    <div className="space-y-2">
                      {reward.externalResponse.products.map((product: any, index: number) => (
                        <div key={product.guid || index} className="bg-white border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">
                                {product.name}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  SKU: {product.sku}
                                </Badge>
                                {product.quantity && (
                                  <span className="text-xs text-gray-600">
                                    Qty: {product.quantity}
                                  </span>
                                )}
                                {product.is_digital === 1 && (
                                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                    Digital
                                  </Badge>
                                )}
                                {product.returned && (
                                  <Badge variant="destructive" className="text-xs">
                                    Returned
                                  </Badge>
                                )}
                                {product.reissue_date && (
                                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Reissued
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-bold text-green-700">
                                {product.points} pts
                              </div>
                              {product.total && (
                                <div className="text-xs text-gray-600">
                                  Total: {product.total}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Additional product details */}
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                            {product.var_amount && product.var_amount !== "0.00" && (
                              <div>
                                <span className="font-medium">Variable Amount:</span> ${product.var_amount}
                              </div>
                            )}
                            {product.program_fee && product.program_fee !== "0.00" && (
                              <div>
                                <span className="font-medium">Program Fee:</span> ${product.program_fee}
                              </div>
                            )}
                            {product.reissue_date && (
                              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded p-1.5 -mx-1">
                                <span className="font-medium text-amber-800">Reissue Date:</span>{' '}
                                <span className="text-amber-900">{formatDate(product.reissue_date)}</span>
                              </div>
                            )}
                            {product.terms_approved !== undefined && (
                              <div>
                                <span className="font-medium">Terms:</span>{' '}
                                {product.terms_approved === 1 ? (
                                  <span className="text-green-700">Approved</span>
                                ) : (
                                  <span className="text-gray-500">Pending</span>
                                )}
                              </div>
                            )}
                            {product.is_wallet_enabled !== undefined && (
                              <div>
                                <span className="font-medium">Wallet:</span>{' '}
                                {product.is_wallet_enabled === 1 ? (
                                  <span className="text-blue-700">Enabled</span>
                                ) : (
                                  <span className="text-gray-500">Disabled</span>
                                )}
                              </div>
                            )}
                            {product.guid && (
                              <div className="col-span-2">
                                <span className="font-medium">Product GUID:</span>{' '}
                                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                  {product.guid}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Points Transaction Details - Only for points rewards */}
          {reward.type === 'points' && reward.externalResponse && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-700" />
                  Points Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Transaction Info */}
                  <div className="bg-white rounded-lg border border-green-300 p-3">
                    <div className="text-sm font-semibold text-gray-800 mb-2">
                      Transaction Information
                    </div>
                    <div className="text-sm space-y-2">
                      {reward.externalResponse.points && (
                        <div>
                          <span className="text-gray-600">Points Issued:</span>{' '}
                          <span className="font-bold text-green-700 text-lg">
                            {reward.externalResponse.points}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.status && (
                        <div>
                          <span className="text-gray-600">Transaction Status:</span>{' '}
                          <Badge
                            variant="outline"
                            className={rewardStackStatusColors[reward.externalResponse.status] || ''}
                          >
                            {reward.externalResponse.status}
                          </Badge>
                        </div>
                      )}
                      {reward.externalResponse.balanceBefore !== undefined && (
                        <div>
                          <span className="text-gray-600">Balance Before:</span>{' '}
                          <span className="font-mono text-gray-800">
                            {reward.externalResponse.balanceBefore}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.balanceAfter !== undefined && (
                        <div>
                          <span className="text-gray-600">Balance After:</span>{' '}
                          <span className="font-mono text-gray-800 font-semibold">
                            {reward.externalResponse.balanceAfter}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.transactionType && (
                        <div>
                          <span className="text-gray-600">Type:</span>{' '}
                          <span className="text-gray-800">{reward.externalResponse.transactionType}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="bg-white rounded-lg border border-green-300 p-3">
                    <div className="text-sm font-semibold text-gray-800 mb-2">
                      Additional Details
                    </div>
                    <div className="text-sm space-y-2">
                      {reward.externalResponse.description && (
                        <div>
                          <span className="text-gray-600">Description:</span>{' '}
                          <span className="text-gray-800">{reward.externalResponse.description}</span>
                        </div>
                      )}
                      {reward.externalResponse.createdAt && (
                        <div>
                          <span className="text-gray-600">RewardSTACK Created:</span>{' '}
                          <span className="text-gray-800">
                            {formatDate(reward.externalResponse.createdAt)}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.processedAt && (
                        <div>
                          <span className="text-gray-600">Processed At:</span>{' '}
                          <span className="text-gray-800">
                            {formatDate(reward.externalResponse.processedAt)}
                          </span>
                        </div>
                      )}
                      {reward.externalResponse.programId && (
                        <div>
                          <span className="text-gray-600">Program ID:</span>{' '}
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {reward.externalResponse.programId}
                          </code>
                        </div>
                      )}
                      {reward.externalResponse.participantId && (
                        <div>
                          <span className="text-gray-600">Participant ID:</span>{' '}
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                            {reward.externalResponse.participantId}
                          </code>
                        </div>
                      )}
                      {reward.externalResponse.reference && (
                        <div>
                          <span className="text-gray-600">Reference:</span>{' '}
                          <span className="text-gray-800">{reward.externalResponse.reference}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RewardSTACK API Response - Collapsible */}
          {reward.externalResponse && (
            <Collapsible>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      RewardSTACK API Response (Advanced)
                    </CardTitle>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    {/* Interactive JSON Viewer */}
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <ReactJson
                        src={reward.externalResponse}
                        name="response"
                        collapsed={1}
                        displayDataTypes={false}
                        displayObjectSize={true}
                        enableClipboard={true}
                        iconStyle="triangle"
                        theme="rjv-default"
                        style={{
                          backgroundColor: 'transparent',
                          fontSize: '12px',
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      />
                    </div>

                    {/* Collapsible Raw JSON */}
                    <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          {showRawJson ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Hide Raw JSON
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Show Raw JSON
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-auto max-h-96">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(reward.externalResponse, null, 2)}
                          </pre>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
