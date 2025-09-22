"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import type { Role } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface InlineProfileProps {
  slug: string
  participantId: string
  email: string
  role: Role
}

export function InlineProfile({ slug, participantId, email, role }: InlineProfileProps) {
  const [editing, setEditing] = useState(false)
  const [currentRole, setCurrentRole] = useState<Role>(role)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!editing) return
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${slug}/participants/${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: currentRole })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to update role')
      }
      toast.success('Profile updated')
      setEditing(false)
      try {
        // @ts-ignore
        if (typeof window !== 'undefined') window.location.reload()
      } catch (_) {}
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{email}</p>
        <p className="text-sm text-gray-500">Email Address</p>
      </div>
      <div className="flex items-center gap-2">
        {!editing ? (
          <Badge variant="outline">{role}</Badge>
        ) : (
          <Select value={currentRole} onValueChange={(v: Role) => setCurrentRole(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PARTICIPANT">Participant</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        )}
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={loading}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…</>) : 'Save'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}


