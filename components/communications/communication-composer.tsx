'use client'

import { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

type CommunicationScopeOption = 'WORKSPACE' | 'CHALLENGE' | 'ACTIVITY'
type CommunicationAudienceOption = 'ALL' | 'ENROLLED' | 'INVITED' | 'COMPLETED'
type CommunicationPriorityOption = 'NORMAL' | 'IMPORTANT' | 'URGENT'

interface ActivityOption {
  id: string
  name: string
}

interface CommunicationComposerProps {
  workspaceSlug: string
  challengeId?: string | null
  activities?: ActivityOption[]
  allowedScopes?: CommunicationScopeOption[]
  defaultScope?: CommunicationScopeOption
  defaultAudience?: CommunicationAudienceOption
  className?: string
  onSent?: () => void
}

const AUDIENCE_OPTIONS: { value: CommunicationAudienceOption; label: string; description: string }[] = [
  { value: 'ALL', label: 'All members', description: 'Everyone in the selected audience' },
  { value: 'ENROLLED', label: 'Currently enrolled', description: 'Participants actively enrolled' },
  { value: 'INVITED', label: 'Invited', description: 'Participants who have been invited but not enrolled yet' },
  { value: 'COMPLETED', label: 'Completed', description: 'Participants who completed or withdrew' },
]

const PRIORITY_OPTIONS: { value: CommunicationPriorityOption; label: string; description: string }[] = [
  { value: 'NORMAL', label: 'Normal', description: 'Regular announcement' },
  { value: 'IMPORTANT', label: 'Important', description: 'Needs attention' },
  { value: 'URGENT', label: 'Urgent', description: 'Requires immediate action' },
]

const SCOPE_LABELS: Record<CommunicationScopeOption, string> = {
  WORKSPACE: 'Entire workspace',
  CHALLENGE: 'Specific challenge',
  ACTIVITY: 'Challenge activity',
}

export function CommunicationComposer({
  workspaceSlug,
  challengeId,
  activities = [],
  allowedScopes = ['WORKSPACE', 'CHALLENGE', 'ACTIVITY'],
  defaultScope,
  defaultAudience = 'ALL',
  className,
  onSent,
}: CommunicationComposerProps) {
  const initialScope =
    defaultScope ||
    (allowedScopes.includes('WORKSPACE')
      ? 'WORKSPACE'
      : allowedScopes.includes('CHALLENGE')
        ? 'CHALLENGE'
        : 'ACTIVITY')

  const [scope, setScope] = useState<CommunicationScopeOption>(initialScope)
  const [audience, setAudience] = useState<CommunicationAudienceOption>(defaultAudience)
  const [priority, setPriority] = useState<CommunicationPriorityOption>('NORMAL')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [activityId, setActivityId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const requiresChallenge = scope === 'CHALLENGE' || scope === 'ACTIVITY'
  const requiresActivity = scope === 'ACTIVITY'

  const readyChallengeId = requiresChallenge ? challengeId : null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide a subject and message for this communication.',
        variant: 'destructive',
      })
      return
    }

    if (requiresChallenge && !challengeId) {
      toast({
        title: 'Cannot send update',
        description: 'A challenge must be specified to send this communication.',
        variant: 'destructive',
      })
      return
    }

    if (requiresActivity && !activityId) {
      toast({
        title: 'Activity required',
        description: 'Select an activity to send an activity-specific communication.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope,
          audience,
          priority,
          subject: subject.trim(),
          message: message.trim(),
          challengeId: readyChallengeId,
          activityId: requiresActivity ? activityId : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to send communication')
      }

      toast({
        title: 'Communication sent!',
        description: `Your ${scope.toLowerCase()} message was delivered to the selected audience.`,
      })

      setSubject('')
      setMessage('')
      setActivityId(null)
      router.refresh()
      onSent?.()
    } catch (error: any) {
      toast({
        title: 'Unable to send message',
        description: error.message || 'An unexpected error occurred while sending your update.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="communication-scope">Audience scope</Label>
          <Select
            value={scope}
            onValueChange={(value) => setScope(value as CommunicationScopeOption)}
            disabled={allowedScopes.length === 1}
          >
            <SelectTrigger id="communication-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedScopes.map((option) => (
                <SelectItem key={option} value={option}>
                  {SCOPE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="communication-audience">Recipient filter</Label>
          <Select value={audience} onValueChange={(value) => setAudience(value as CommunicationAudienceOption)}>
            <SelectTrigger id="communication-audience">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="communication-priority">Priority level</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as CommunicationPriorityOption)}>
            <SelectTrigger id="communication-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {requiresActivity && (
          <div className="grid gap-2">
            <Label htmlFor="communication-activity">Select activity</Label>
            <Select
              value={activityId ?? ''}
              onValueChange={(value) => setActivityId(value || null)}
            >
              <SelectTrigger id="communication-activity">
                <SelectValue placeholder="Select activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" disabled>
                  Select activity
                </SelectItem>
                {activities.length === 0 && (
                  <SelectItem value="__empty" disabled>
                    No activities available
                  </SelectItem>
                )}
                {activities.map((activity) => (
                  <SelectItem key={activity.id} value={activity.id}>
                    {activity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="communication-subject">Subject</Label>
          <Input
            id="communication-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Update subject"
            maxLength={120}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="communication-message">Message</Label>
          <Textarea
            id="communication-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write your announcement here... (Markdown supported)"
            rows={6}
            required
          />
          <p className="text-xs text-muted-foreground">
            Markdown formatting is supported. Use **bold**, *italic*, and more.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send update'}
          </Button>
        </div>
      </div>
    </form>
  )
}
