"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

type Challenge = {
  id: string
  title: string
  enrollments?: { userId: string }[]
}

interface ChallengeAssignmentProps {
  slug: string
  participantId: string
}

export function ChallengeAssignment({ slug, participantId }: ChallengeAssignmentProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/workspaces/${slug}/challenges`)
        if (!res.ok) throw new Error("Failed to load challenges")
        const data = await res.json()
        setChallenges(data.challenges || [])
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load challenges")
      }
    }
    load()
  }, [slug])

  const handleAssign = async () => {
    if (!selectedChallengeId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${slug}/participants/${participantId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: selectedChallengeId, status: "ENROLLED" })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || err.message || "Failed to enroll participant")
      }
      toast.success("Participant enrolled in challenge")
      setSelecting(false)
      setSelectedChallengeId("")
      // Best effort refresh
      try {
        // @ts-ignore
        if (typeof window !== 'undefined') window.location.reload()
      } catch (_) {}
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enroll participant")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {!selecting ? (
        <Button variant="outline" size="sm" onClick={() => setSelecting(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add to Challenge
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="min-w-[260px]">
            <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a challenge" />
              </SelectTrigger>
              <SelectContent>
                {challenges.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span>{c.title}</span>
                      {Array.isArray(c.enrollments) && c.enrollments.length > 0 && (
                        <Badge variant="outline" className="text-xs">{c.enrollments.length}</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSelecting(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedChallengeId || loading}>
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding…</>) : "Add"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}


