'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DuplicateChallengeButtonProps {
  workspaceSlug: string
  sourceChallenge: {
    title: string
    description: string
    startDate: string | Date
    endDate: string | Date
    enrollmentDeadline?: string | Date | null
  }
  invitedParticipantIds: string[]
  enrolledParticipantIds: string[]
}

export function DuplicateChallengeButton({
  workspaceSlug,
  sourceChallenge,
  invitedParticipantIds,
  enrolledParticipantIds
}: DuplicateChallengeButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleDuplicate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${sourceChallenge.title} (Copy)`,
          description: sourceChallenge.description,
          startDate: sourceChallenge.startDate,
          endDate: sourceChallenge.endDate,
          enrollmentDeadline: sourceChallenge.enrollmentDeadline || undefined,
          invitedParticipantIds,
          enrolledParticipantIds
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate challenge')
      }

      const data = await response.json()
      const newId = data.challenge?.id
      toast({ title: 'Challenge duplicated', description: 'We created a copy of this challenge.' })
      if (newId) {
        router.push(`/w/${workspaceSlug}/admin/challenges/${newId}`)
      }
    } catch (error: any) {
      toast({ title: 'Error duplicating', description: error.message || 'Please try again.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleDuplicate} disabled={isLoading}>
      <Copy className="h-4 w-4 mr-2" />
      {isLoading ? 'Duplicating...' : 'Duplicate'}
    </Button>
  )
}


