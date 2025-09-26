"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

type NotificationPrefs = {
  reviewQueue?: boolean
  enrollmentChanges?: boolean
  inviteEvents?: boolean
}

export type AdminProfileInitial = {
  fullName: string
  email: string
  joinedAtISO: string
  roleLabel: string
  organization?: string
  avatarUrl?: string | null
  timezone?: string
  dateFormat?: string
  reducedMotion?: boolean
  showKeyboardHints?: boolean
  notificationPrefs?: NotificationPrefs
}

const TIMEZONES = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : [
  Intl.DateTimeFormat().resolvedOptions().timeZone
]

const DATE_FORMATS = [
  { id: "MM/dd/yyyy", label: "MM/dd/yyyy" },
  { id: "dd/MM/yyyy", label: "dd/MM/yyyy" },
  { id: "yyyy-MM-dd", label: "yyyy-MM-dd" }
]

export default function AdminProfileForm({ initial }: { initial: AdminProfileInitial }) {
  const [fullName, setFullName] = useState(initial.fullName || "")
  const [organization, setOrganization] = useState(initial.organization || "")
  const [timezone, setTimezone] = useState(initial.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [dateFormat, setDateFormat] = useState(initial.dateFormat || "MM/dd/yyyy")
  const [reducedMotion, setReducedMotion] = useState<boolean>(initial.reducedMotion ?? false)
  const [showKeyboardHints, setShowKeyboardHints] = useState<boolean>(initial.showKeyboardHints ?? false)
  const [reviewQueue, setReviewQueue] = useState<boolean>(initial.notificationPrefs?.reviewQueue ?? true)
  const [enrollmentChanges, setEnrollmentChanges] = useState<boolean>(initial.notificationPrefs?.enrollmentChanges ?? true)
  const [inviteEvents, setInviteEvents] = useState<boolean>(initial.notificationPrefs?.inviteEvents ?? true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const pristine = useMemo(() => {
    return (
      fullName === (initial.fullName || "") &&
      organization === (initial.organization || "") &&
      timezone === (initial.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone) &&
      dateFormat === (initial.dateFormat || "MM/dd/yyyy") &&
      reducedMotion === (initial.reducedMotion ?? false) &&
      showKeyboardHints === (initial.showKeyboardHints ?? false) &&
      reviewQueue === (initial.notificationPrefs?.reviewQueue ?? true) &&
      enrollmentChanges === (initial.notificationPrefs?.enrollmentChanges ?? true) &&
      inviteEvents === (initial.notificationPrefs?.inviteEvents ?? true)
    )
  }, [fullName, organization, timezone, dateFormat, reducedMotion, showKeyboardHints, reviewQueue, enrollmentChanges, inviteEvents, initial])

  // Unsaved-changes guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!pristine) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [pristine])

  // Client-side route change guard for Next App Router
  const hasPromptedRef = useRef(false)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      const link = t.closest("a[href]") as HTMLAnchorElement | null
      if (!link) return
      if (link.target === "_blank" || link.download) return
      if (!pristine && !hasPromptedRef.current) {
        const ok = confirm("You have unsaved changes. Discard them?")
        if (!ok) {
          e.preventDefault()
          e.stopPropagation()
        } else {
          hasPromptedRef.current = true
          // allow this one navigation
          setTimeout(() => (hasPromptedRef.current = false), 500)
        }
      }
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [pristine])

  const validate = () => {
    const next: Record<string, string> = {}
    if (!fullName.trim()) next.fullName = "Enter your full name"
    if (!organization.trim()) next.organization = "Enter your organization"
    if (!TIMEZONES.includes(timezone)) next.timezone = "Choose a valid timezone"
    if (!DATE_FORMATS.find(f => f.id === dateFormat)) next.dateFormat = "Choose a supported date format"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onReset = () => {
    setFullName(initial.fullName || "")
    setOrganization(initial.organization || "")
    setTimezone(initial.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
    setDateFormat(initial.dateFormat || "MM/dd/yyyy")
    setReducedMotion(initial.reducedMotion ?? false)
    setShowKeyboardHints(initial.showKeyboardHints ?? false)
    setReviewQueue(initial.notificationPrefs?.reviewQueue ?? true)
    setEnrollmentChanges(initial.notificationPrefs?.enrollmentChanges ?? true)
    setInviteEvents(initial.notificationPrefs?.inviteEvents ?? true)
    setErrors({})
  }

  const onSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          organization: organization.trim(),
          timezone,
          dateFormat,
          reducedMotion,
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
        throw new Error(err.error || "Failed to save profile")
      }
      toast.success("Changes saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const nowPreview = useMemo(() => {
    try {
      const date = new Date(initial.joinedAtISO || new Date().toISOString())
      const opts: Intl.DateTimeFormatOptions = { weekday: "short", year: "numeric", month: "short", day: "2-digit" }
      const z = new Intl.DateTimeFormat("en-US", { ...opts, timeZone: timezone })
      return `${z.format(date)} – ${timezone}`
    } catch {
      return `${new Date().toDateString()} – ${timezone}`
    }
  }, [timezone, initial.joinedAtISO])

  return (
    <form className="space-y-8" onSubmit={e => { e.preventDefault(); onSave() }} aria-labelledby="admin-profile-form">
      {/* Header metadata card (identity) */}
      <section aria-label="Profile header" className="rounded-md border p-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="admin-profile-form" className="text-base font-semibold">Admin Profile</h2>
            <p className="text-sm text-gray-600">Manage your profile and workspace preferences.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div>
            <label className="text-sm text-gray-700">Name</label>
            <p className="text-sm font-medium" aria-live="polite">{fullName || "—"}</p>
          </div>
          <div>
            <label className="text-sm text-gray-700">Email</label>
            <p className="text-sm font-medium break-words" aria-live="polite">{initial.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-700">Organization</label>
            <p className="text-sm" aria-live="polite">{organization || initial.organization || "—"}</p>
          </div>
          <div>
            <label className="text-sm text-gray-700">Joined</label>
            <p className="text-sm" aria-live="polite">{new Date(initial.joinedAtISO).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm text-gray-700">Role</label>
            <p className="text-sm uppercase">{initial.roleLabel}</p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Profile section */}
      <section aria-labelledby="profile-section" className="space-y-4">
        <h3 id="profile-section" className="text-sm font-semibold">Profile</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium">Full name</label>
            <Input id="fullName" aria-invalid={!!errors.fullName} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
            {errors.fullName && <p className="mt-1 text-xs text-red-600" role="alert">{errors.fullName}</p>}
            <p className="mt-1 text-xs text-gray-500">Used across the workspace.</p>
          </div>
          <div>
            <label htmlFor="organization" className="block text-sm font-medium">Organization</label>
            <Input id="organization" aria-invalid={!!errors.organization} value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Your organization" />
            {errors.organization && <p className="mt-1 text-xs text-red-600" role="alert">{errors.organization}</p>}
            <p className="mt-1 text-xs text-gray-500">Shown in admin contexts; does not rename the workspace.</p>
          </div>
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium">Timezone</label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone" aria-invalid={!!errors.timezone}>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.timezone && <p className="mt-1 text-xs text-red-600" role="alert">{errors.timezone}</p>}
            <p className="mt-1 text-xs text-gray-500">Preview: {nowPreview}</p>
          </div>
          <div>
            <label htmlFor="dateFormat" className="block text-sm font-medium">Date format</label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger id="dateFormat" aria-invalid={!!errors.dateFormat}>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map(fmt => (
                  <SelectItem key={fmt.id} value={fmt.id}>{fmt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dateFormat && <p className="mt-1 text-xs text-red-600" role="alert">{errors.dateFormat}</p>}
          </div>
        </div>
      </section>

      <Separator />

      {/* Accessibility section */}
      <section aria-labelledby="access-section" className="space-y-4">
        <h3 id="access-section" className="text-sm font-semibold">Accessibility</h3>
        <div className="divide-y rounded-md border">
          <div className="flex items-start justify-between p-4">
            <div className="pr-4">
              <p className="text-sm font-medium">Reduced motion</p>
              <p className="text-xs text-gray-500">Respects your system preference (prefers-reduced-motion). Toggle to override for this workspace.</p>
            </div>
            <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} aria-label="Reduced motion" />
          </div>
          <div className="flex items-start justify-between p-4">
            <div className="pr-4">
              <p className="text-sm font-medium">Keyboard hints</p>
              <p className="text-xs text-gray-500">Show inline shortcut cues near key actions. See the shortcuts guide.</p>
            </div>
            <Switch checked={showKeyboardHints} onCheckedChange={setShowKeyboardHints} aria-label="Keyboard hints" />
          </div>
        </div>
      </section>

      <Separator />

      {/* Notifications section */}
      <section aria-labelledby="notify-section" className="space-y-4">
        <h3 id="notify-section" className="text-sm font-semibold">Notifications</h3>
        <div className="rounded-md border divide-y">
          <div className="flex items-start justify-between p-4">
            <div className="pr-4">
              <p className="text-sm font-medium">Review queue updates</p>
              <p className="text-xs text-gray-500">Email when new items need review. Frequency: immediate.</p>
            </div>
            <Switch checked={reviewQueue} onCheckedChange={setReviewQueue} aria-label="Toggle review queue notifications" />
          </div>
          <div className="flex items-start justify-between p-4">
            <div className="pr-4">
              <p className="text-sm font-medium">Enrollment changes</p>
              <p className="text-xs text-gray-500">Email when a participant joins, leaves, or is updated. Frequency: daily summary.</p>
            </div>
            <Switch checked={enrollmentChanges} onCheckedChange={setEnrollmentChanges} aria-label="Toggle enrollment notifications" />
          </div>
          <div className="flex items-start justify-between p-4">
            <div className="pr-4">
              <p className="text-sm font-medium">Invite events</p>
              <p className="text-xs text-gray-500">Email when invites are sent or accepted. Frequency: immediate.</p>
            </div>
            <Switch checked={inviteEvents} onCheckedChange={setInviteEvents} aria-label="Toggle invite notifications" />
          </div>
        </div>
      </section>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-white px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onReset} disabled={saving || pristine} aria-label="Reset changes">Cancel</Button>
          <Button type="submit" onClick={onSave} disabled={saving || pristine} aria-label="Save changes">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  )
}


