"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function ProfileNameForm({ slug, initialName }: { slug: string; initialName: string }) {
  const [name, setName] = useState(initialName || "")
  const [saving, setSaving] = useState(false)

  const onSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/workspaces/${slug}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || err.message || "Failed to update profile")
      }
      toast.success("Profile updated")
      if (typeof window !== "undefined") {
        // refresh header name
        window.location.reload()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-600">Full name</label>
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
        <Button onClick={onSave} disabled={saving || !name.trim()}>{saving ? "Saving…" : "Save"}</Button>
      </div>
      <p className="text-xs text-gray-500">This updates your display name across the workspace.</p>
    </div>
  )
}


