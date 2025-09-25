"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function ProfileAdminForm({ initial }: {
  initial: { timezone?: string, dateFormat?: string, reducedMotion?: boolean, uiDensity?: 'comfortable' | 'compact', showKeyboardHints?: boolean, notificationPrefs?: { reviewQueue?: boolean; enrollmentChanges?: boolean; inviteEvents?: boolean } }
}) {
  const [timezone, setTimezone] = useState(initial.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [dateFormat, setDateFormat] = useState(initial.dateFormat || 'MM/dd/yyyy')
  const [reducedMotion, setReducedMotion] = useState<boolean>(initial.reducedMotion ?? false)
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>(initial.uiDensity || 'comfortable')
  const [showKeyboardHints, setShowKeyboardHints] = useState<boolean>(initial.showKeyboardHints ?? false)
  const [reviewQueue, setReviewQueue] = useState<boolean>(initial.notificationPrefs?.reviewQueue ?? true)
  const [enrollmentChanges, setEnrollmentChanges] = useState<boolean>(initial.notificationPrefs?.enrollmentChanges ?? true)
  const [inviteEvents, setInviteEvents] = useState<boolean>(initial.notificationPrefs?.inviteEvents ?? true)
  const [saving, setSaving] = useState(false)

  const onSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timezone,
          dateFormat,
          reducedMotion,
          uiDensity,
          showKeyboardHints,
          notificationPrefs: {
            reviewQueue,
            enrollmentChanges,
            inviteEvents
          }
        })
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
      <div>
        <label className="text-sm text-gray-600">Date format</label>
        <Input value={dateFormat} onChange={e => setDateFormat(e.target.value)} placeholder="e.g., MM/dd/yyyy" />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-800">Reduced motion</p>
            <p className="text-xs text-gray-500">Minimize animations in the UI</p>
          </div>
          <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-800">Keyboard hints</p>
            <p className="text-xs text-gray-500">Show shortcuts and hints</p>
          </div>
          <Switch checked={showKeyboardHints} onCheckedChange={setShowKeyboardHints} />
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium text-gray-800">Notifications</p>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Review queue updates</span>
          <Switch checked={reviewQueue} onCheckedChange={setReviewQueue} />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Enrollment changes</span>
          <Switch checked={enrollmentChanges} onCheckedChange={setEnrollmentChanges} />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Invite events</span>
          <Switch checked={inviteEvents} onCheckedChange={setInviteEvents} />
        </div>
      </div>
      <div>
        <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
      </div>
    </div>
  )
}


