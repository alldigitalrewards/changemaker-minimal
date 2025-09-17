'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PauseCircle, PlayCircle, Archive } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

type ChallengeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

interface StatusActionsProps {
  workspaceSlug: string
  challengeId: string
  status: ChallengeStatus
}

export function StatusActions({ workspaceSlug, challengeId, status }: StatusActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  const call = async (action: 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE') => {
    setLoading(action)
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/challenges/${challengeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update status')
      }
      toast({ title: 'Status updated' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(status !== 'PUBLISHED') && (
        <Button variant="outline" onClick={() => call('PUBLISH')} disabled={loading !== null}>
          <PlayCircle className="h-4 w-4 mr-2" />
          {loading === 'PUBLISH' ? 'Publishing…' : 'Publish'}
        </Button>
      )}
      {(status === 'PUBLISHED') && (
        <Button variant="outline" onClick={() => call('UNPUBLISH')} disabled={loading !== null}>
          <PauseCircle className="h-4 w-4 mr-2" />
          {loading === 'UNPUBLISH' ? 'Unpublishing…' : 'Unpublish'}
        </Button>
      )}
      {status !== 'ARCHIVED' && (
        <Button variant="outline" onClick={() => call('ARCHIVE')} disabled={loading !== null}>
          <Archive className="h-4 w-4 mr-2" />
          {loading === 'ARCHIVE' ? 'Archiving…' : 'Archive'}
        </Button>
      )}
    </div>
  )
}


