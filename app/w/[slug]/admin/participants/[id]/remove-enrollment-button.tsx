"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, UserMinus } from "lucide-react"

interface RemoveEnrollmentButtonProps {
  slug: string
  participantId: string
  enrollmentId: string
}

export function RemoveEnrollmentButton({ slug, participantId, enrollmentId }: RemoveEnrollmentButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleRemove = async () => {
    const confirmed = window.confirm("Remove this participant from the challenge?")
    if (!confirmed) return
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${slug}/participants/${participantId}/enrollments/${enrollmentId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || err.message || 'Failed to remove enrollment')
      }
      toast.success('Participant removed from challenge')
      try {
        // @ts-ignore
        if (typeof window !== 'undefined') window.location.reload()
      } catch (_) {}
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove enrollment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRemove} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserMinus className="h-4 w-4 mr-2" />}
      {loading ? 'Removing…' : 'Remove'}
    </Button>
  )
}


