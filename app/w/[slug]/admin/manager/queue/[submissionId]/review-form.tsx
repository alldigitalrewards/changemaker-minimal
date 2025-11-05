'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CheckCircle, XCircle, Edit, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ManagerReviewFormProps {
  submissionId: string
  workspaceSlug: string
  challengeTitle: string
  activityName: string
}

export function ManagerReviewForm({
  submissionId,
  workspaceSlug,
  challengeTitle,
  activityName,
}: ManagerReviewFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [action, setAction] = useState<'approve' | 'reject'>('approve')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    // Validate notes for rejection
    if (action === 'reject' && !notes.trim()) {
      toast({
        title: 'Notes Required',
        description: 'Please provide feedback when requesting revisions.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

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
            notes: notes.trim() || null,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit review')
      }

      const actionLabel = action === 'approve' ? 'approved' : 'marked for revision'

      toast({
        title: 'Review Submitted',
        description: `Submission ${actionLabel} successfully.`,
      })

      // Redirect back to queue after short delay
      setTimeout(() => {
        router.push(`/w/${workspaceSlug}/admin/manager/queue`)
        router.refresh()
      }, 1000)
    } catch (error) {
      console.error('Error submitting review:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit review. Please try again.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Review Submission</CardTitle>
        <CardDescription>
          Review {activityName} submission for {challengeTitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Action Selection */}
          <div className="space-y-3">
            <Label className="text-base">Decision</Label>
            <RadioGroup value={action} onValueChange={(value) => setAction(value as 'approve' | 'reject')}>
              <div className="flex items-center space-x-2 rounded-md border p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="approve" id="approve" />
                <Label htmlFor="approve" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">Approve</div>
                      <div className="text-xs text-muted-foreground">
                        Mark submission as manager-approved (pending admin final approval)
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 rounded-md border p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="reject" id="reject" />
                <Label htmlFor="reject" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="font-medium">Request Revisions</div>
                      <div className="text-xs text-muted-foreground">
                        Ask participant to make changes and resubmit
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {action === 'reject' ? 'Feedback (Required)' : 'Notes (Optional)'}
            </Label>
            <Textarea
              id="notes"
              placeholder={
                action === 'reject'
                  ? 'Explain what needs to be revised...'
                  : 'Add any additional notes for the participant or admin...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
              required={action === 'reject'}
            />
            {action === 'reject' && (
              <p className="text-xs text-muted-foreground">
                Feedback is required when requesting revisions to help the participant improve their submission.
              </p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={
                action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  {action === 'approve' ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Submission
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Request Revisions
                    </>
                  )}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => router.push(`/w/${workspaceSlug}/admin/manager/queue`)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
