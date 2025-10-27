'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface ManagerReviewButtonProps {
  submissionId: string
  workspaceSlug: string
  challengeTitle: string
  activityName: string
  userEmail: string
}

export function ManagerReviewButton({
  submissionId,
  workspaceSlug,
  challengeTitle,
  activityName,
  userEmail,
}: ManagerReviewButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [notes, setNotes] = useState('')

  const handleSubmit = async () => {
    if (!action) return

    // Validate notes for reject action
    if (action === 'reject' && !notes.trim()) {
      toast({
        title: 'Notes required',
        description: 'Please provide feedback for the participant when requesting changes.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/submissions/${submissionId}/manager-review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            notes: notes.trim() || undefined,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to review submission')
      }

      toast({
        title: action === 'approve' ? 'Submission approved' : 'Changes requested',
        description:
          action === 'approve'
            ? 'The submission has been approved and sent to admin for final review.'
            : 'The participant will be notified to revise their submission.',
      })

      setOpen(false)
      setAction(null)
      setNotes('')
      router.refresh()
    } catch (error) {
      console.error('Error reviewing submission:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to review submission',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (selectedAction: 'approve' | 'reject') => {
    setAction(selectedAction)
    setOpen(true)
  }

  const handleClose = () => {
    if (!loading) {
      setOpen(false)
      setAction(null)
      setNotes('')
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => handleOpenDialog('approve')}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenDialog('reject')}
          className="border-orange-500 text-orange-600 hover:bg-orange-50"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Request Changes
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Submission' : 'Request Changes'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? 'This will send the submission to an admin for final approval.'
                : 'The participant will be asked to revise and resubmit.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Submission:</strong> {challengeTitle} • {activityName}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Participant:</strong> {userEmail}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">
                Manager Notes {action === 'reject' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  action === 'approve'
                    ? 'Optional: Add notes for the admin reviewer...'
                    : 'Required: Explain what needs to be improved...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={loading}
              />
              {action === 'reject' && !notes.trim() && (
                <p className="text-sm text-red-500">
                  Notes are required when requesting changes
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || (action === 'reject' && !notes.trim())}
              className={
                action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === 'approve' ? 'Approve for Admin' : 'Request Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
