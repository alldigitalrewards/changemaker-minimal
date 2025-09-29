'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ParticipantSelector } from '@/components/ui/participant-selector'

type UserId = string

interface Props {
  workspaceSlug: string
  challengeId: string
  initialInvitedIds: UserId[]
  initialEnrolledIds: UserId[]
  challengeTitle: string
  challengeDescription: string
  startDate: string
  endDate: string
  enrollmentDeadline?: string | null
}

export default function ParticipantsManager(props: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [participantData, setParticipantData] = useState<{ invited: UserId[]; enrolled: UserId[]}>({
    invited: props.initialInvitedIds || [],
    enrolled: props.initialEnrolledIds || []
  })
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/workspaces/${props.workspaceSlug}/challenges/${props.challengeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: props.challengeTitle,
          description: props.challengeDescription,
          startDate: props.startDate,
          endDate: props.endDate,
          enrollmentDeadline: props.enrollmentDeadline || undefined,
          invitedParticipantIds: participantData.invited,
          enrolledParticipantIds: participantData.enrolled,
        })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save participants')
      }
      toast({ title: 'Participants updated' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <ParticipantSelector
        workspaceSlug={props.workspaceSlug}
        selectedParticipantIds={[...participantData.invited, ...participantData.enrolled]}
        onParticipantsChange={() => {}}
        initialInvitedIds={props.initialInvitedIds}
        initialEnrolledIds={props.initialEnrolledIds}
        onParticipantDataChange={setParticipantData}
        disabled={isSaving}
      />
      <div className="flex justify-end">
        <Button onClick={save} disabled={isSaving} variant="outline">
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}


