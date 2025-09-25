"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function ProfileParticipantForm({ initial }: {
  initial: { department?: string; bio?: string; timezone?: string }
}) {
  const [department, setDepartment] = useState(initial.department || "")
  const [bio, setBio] = useState(initial.bio || "")
  const [timezone, setTimezone] = useState(initial.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [saving, setSaving] = useState(false)

  const onSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department, bio, timezone })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save profile')
      }
      toast.success('Profile updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-gray-600">Department</label>
        <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g., Marketing" />
      </div>
      <div>
        <label className="text-sm text-gray-600">Bio</label>
        <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio" rows={4} />
      </div>
      <div>
        <label className="text-sm text-gray-600">Timezone</label>
        <Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="e.g., America/New_York" />
      </div>
      <div>
        <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
      </div>
    </div>
  )
}


