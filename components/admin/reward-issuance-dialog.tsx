'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface Participant {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
}

interface WorkspaceSku {
  id: string
  skuId: string
  name: string
  description: string | null
  value: number | null
  isDefault: boolean
}

interface RewardIssuanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  workspaceSlug?: string
}

export function RewardIssuanceDialog({
  open,
  onOpenChange,
  onSuccess,
  workspaceSlug: propSlug,
}: RewardIssuanceDialogProps) {
  const params = useParams<{ slug: string }>()
  const workspaceSlug = propSlug || params?.slug
  const { toast } = useToast()

  // Form state
  const [rewardType, setRewardType] = useState<'points' | 'sku'>('points')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedSkuId, setSelectedSkuId] = useState('')
  const [description, setDescription] = useState('')

  // Data state
  const [participants, setParticipants] = useState<Participant[]>([])
  const [skus, setSkus] = useState<WorkspaceSku[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [loadingSkus, setLoadingSkus] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Participant RewardSTACK status
  const [participantStatus, setParticipantStatus] = useState<{
    enabled: boolean
    synced: boolean
    message: string
    programId?: string
  } | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [hasCompleteAddress, setHasCompleteAddress] = useState(false)

  // Load participants and SKUs when dialog opens
  useEffect(() => {
    if (open && workspaceSlug) {
      loadParticipants()
      loadSkus()
    }
  }, [open, workspaceSlug])

  // Check participant RewardSTACK status when participant is selected
  useEffect(() => {
    const checkParticipantStatus = async () => {
      if (!selectedUserId || !workspaceSlug) {
        setParticipantStatus(null)
        setHasCompleteAddress(false)
        return
      }

      // Check if selected participant has complete address
      const selectedParticipant = participants.find(p => p.id === selectedUserId)
      if (selectedParticipant) {
        const addressComplete = !!(
          selectedParticipant.addressLine1 &&
          selectedParticipant.city &&
          selectedParticipant.state &&
          selectedParticipant.zipCode &&
          selectedParticipant.country
        )
        setHasCompleteAddress(addressComplete)
      }

      setLoadingStatus(true)
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceSlug}/participants/${selectedUserId}/rewardstack-status`
        )
        if (res.ok) {
          const data = await res.json()
          setParticipantStatus(data)
        }
      } catch (error) {
        console.error('Failed to check participant status:', error)
      } finally {
        setLoadingStatus(false)
      }
    }

    checkParticipantStatus()
  }, [selectedUserId, workspaceSlug, participants])

  const loadParticipants = async () => {
    if (!workspaceSlug) return
    setLoadingParticipants(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/participants`)
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to load participants')
      }
      const data = await res.json()
      setParticipants(data.participants || [])
    } catch (error: any) {
      toast({
        title: 'Error loading participants',
        description: error.message || 'Failed to load participants',
        variant: 'destructive',
      })
    } finally {
      setLoadingParticipants(false)
    }
  }

  const loadSkus = async () => {
    if (!workspaceSlug) return
    setLoadingSkus(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/skus`)
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to load SKUs')
      }
      const data = await res.json()
      setSkus(data.skus || [])
    } catch (error: any) {
      toast({
        title: 'Error loading SKUs',
        description: error.message || 'Failed to load SKUs',
        variant: 'destructive',
      })
    } finally {
      setLoadingSkus(false)
    }
  }

  const syncParticipant = async () => {
    if (!selectedUserId || !workspaceSlug) return

    setSyncing(true)
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceSlug}/participants/${selectedUserId}/rewardstack-sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to sync participant')
      }

      const data = await res.json()

      toast({
        title: 'Participant Synced',
        description: 'Participant data has been synced to RewardSTACK',
      })

      // Refresh the participant status
      const statusRes = await fetch(
        `/api/workspaces/${workspaceSlug}/participants/${selectedUserId}/rewardstack-status`
      )
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setParticipantStatus(statusData)
      }
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync participant to RewardSTACK',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUserId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a participant',
        variant: 'destructive',
      })
      return
    }

    if (!description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a description',
        variant: 'destructive',
      })
      return
    }

    if (rewardType === 'points') {
      const pointsAmount = parseInt(amount)
      if (!amount || pointsAmount <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid points amount greater than 0',
          variant: 'destructive',
        })
        return
      }
    } else if (rewardType === 'sku') {
      if (!selectedSkuId) {
        toast({
          title: 'Validation Error',
          description: 'Please select a SKU',
          variant: 'destructive',
        })
        return
      }
    }

    setSubmitting(true)
    try {
      const payload =
        rewardType === 'points'
          ? {
              type: 'points',
              userId: selectedUserId,
              amount: parseInt(amount),
              description: description.trim(),
            }
          : {
              type: 'sku',
              userId: selectedUserId,
              skuId: selectedSkuId,
              description: description.trim(),
            }

      const res = await fetch(`/api/workspaces/${workspaceSlug}/rewards/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to issue reward')
      }

      const data = await res.json()

      const successMessage = rewardType === 'sku'
        ? `SKU reward issued successfully. Transaction ID: ${data.rewardStackResponse?.rewardStackTransactionId || 'pending'}`
        : `${amount} points issued successfully`

      toast({
        title: 'Reward Issued Successfully',
        description: data.message || successMessage,
      })

      // Reset form
      setSelectedUserId('')
      setAmount('')
      setSelectedSkuId('')
      setDescription('')
      setRewardType('points')

      // Close dialog and notify parent
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error Issuing Reward',
        description: error.message || 'Failed to issue reward',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getParticipantDisplay = (participant: Participant) => {
    if (participant.displayName) return participant.displayName
    if (participant.firstName && participant.lastName) {
      return `${participant.firstName} ${participant.lastName}`
    }
    return participant.email
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Issue Reward</DialogTitle>
            <DialogDescription>
              Issue points or SKU rewards to participants in your workspace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Reward Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="reward-type">Reward Type</Label>
              <Select
                value={rewardType}
                onValueChange={(value) => setRewardType(value as 'points' | 'sku')}
              >
                <SelectTrigger id="reward-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Points</SelectItem>
                  <SelectItem value="sku">SKU (Physical/Digital Reward)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Participant Selection */}
            <div className="space-y-2">
              <Label htmlFor="participant">Participant</Label>
              {loadingParticipants ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading participants...
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="participant">
                    <SelectValue placeholder="Select a participant" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        <div className="flex flex-col">
                          <span>{getParticipantDisplay(participant)}</span>
                          <span className="text-xs text-gray-500">{participant.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* RewardSTACK Status */}
              {selectedUserId && (
                <div className="mt-2">
                  {loadingStatus ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking participant status...
                    </div>
                  ) : participantStatus?.enabled ? (
                    <div className="space-y-2">
                      <div
                        className={`rounded-md px-3 py-2 text-xs ${
                          participantStatus.synced
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {participantStatus.message}
                      </div>
                      {!participantStatus.synced && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={syncParticipant}
                          disabled={syncing}
                          className="w-full"
                        >
                          {syncing ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Syncing to RewardSTACK...
                            </>
                          ) : (
                            'Sync to RewardSTACK'
                          )}
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Conditional Fields based on Reward Type */}
            {rewardType === 'points' ? (
              <div className="space-y-2">
                <Label htmlFor="amount">Points Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  placeholder="Enter points amount (e.g., 100)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Points will be credited to the participant's RewardSTACK account
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="sku">Select SKU</Label>
                {loadingSkus ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading SKUs...
                  </div>
                ) : skus.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No SKUs available. Contact your platform administrator to assign SKUs to
                    this workspace.
                  </p>
                ) : (
                  <Select value={selectedSkuId} onValueChange={setSelectedSkuId}>
                    <SelectTrigger id="sku">
                      <SelectValue placeholder="Select a SKU" />
                    </SelectTrigger>
                    <SelectContent>
                      {skus.map((sku) => (
                        <SelectItem key={sku.id} value={sku.skuId}>
                          <div className="flex flex-col">
                            <span className="font-medium">{sku.name}</span>
                            {sku.description && (
                              <span className="text-xs text-gray-500">{sku.description}</span>
                            )}
                            {sku.value && (
                              <span className="text-xs text-gray-500">
                                Value: ${(sku.value / 100).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Address requirement warning for SKU */}
                {selectedUserId && (
                  <div className={`mt-2 rounded-md px-3 py-2 text-xs border ${
                    hasCompleteAddress
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {hasCompleteAddress ? (
                      <span>Participant has complete shipping address</span>
                    ) : (
                      <span>
                        Participant is missing required shipping address fields.
                        Please ask them to complete their profile before issuing catalog rewards.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description/Reason</Label>
              <Textarea
                id="description"
                placeholder="Enter the reason for this reward (e.g., 'Completed challenge successfully')"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || (rewardType === 'sku' && !hasCompleteAddress)}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Issuing...
                </>
              ) : (
                'Issue Reward'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
