"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function ProfileAdminForm({ initial }: {
  initial: { timezone?: string }
}) {
  const [timezone, setTimezone] = useState(initial.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true)
  const [saving, setSaving] = useState(false)

  const onSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone })
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
        <label className="text-sm text-gray-600">Timezone</label>
        <Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="e.g., UTC" />
      </div>
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium text-gray-800">Email notifications</p>
          <p className="text-xs text-gray-500">Receive notifications for reviews and invites</p>
        </div>
        <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
      </div>
      <div>
        <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
      </div>
    </div>
  )
}


