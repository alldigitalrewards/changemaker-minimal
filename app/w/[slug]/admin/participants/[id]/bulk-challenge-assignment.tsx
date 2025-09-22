"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

type Challenge = { id: string; title: string }

interface BulkChallengeAssignmentProps {
  slug: string
  participantId: string
  alreadyEnrolledIds: string[]
}

export function BulkChallengeAssignment({ slug, participantId, alreadyEnrolledIds }: BulkChallengeAssignmentProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        const res = await fetch(`/api/workspaces/${slug}/challenges`)
        if (!res.ok) throw new Error("Failed to load challenges")
        const data = await res.json()
        const all: Challenge[] = (data.challenges || []).map((c: any) => ({ id: c.id, title: c.title }))
        setChallenges(all.filter(c => !alreadyEnrolledIds.includes(c.id)))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load challenges')
      }
    }
    load()
  }, [open, slug, alreadyEnrolledIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return challenges
    return challenges.filter(c => c.title.toLowerCase().includes(q))
  }, [query, challenges])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleAssign = async () => {
    if (selected.size === 0) return
    setLoading(true)
    try {
      for (const challengeId of Array.from(selected)) {
        const res = await fetch(`/api/workspaces/${slug}/participants/${participantId}/enrollments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId, status: 'ENROLLED' })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || err.message || 'Failed to enroll')
        }
      }
      toast.success(`Enrolled in ${selected.size} challenge${selected.size === 1 ? '' : 's'}`)
      setOpen(false)
      setSelected(new Set())
      try {
        // @ts-ignore
        if (typeof window !== 'undefined') window.location.reload()
      } catch (_) {}
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to enroll into some challenges')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" /> Bulk Add to Challenges
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Add to Challenges</DialogTitle>
          <DialogDescription>Select one or more challenges to enroll this participant.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search challenges" />
          <div className="max-h-64 overflow-auto space-y-2">
            {filtered.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-2 border rounded">
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                <span>{c.title}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className="text-sm text-gray-500">No challenges available</div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.size === 0 || loading}>
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enrolling…</>) : 'Enroll' }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


