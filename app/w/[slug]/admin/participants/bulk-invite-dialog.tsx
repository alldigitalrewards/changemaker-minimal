"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Upload } from "lucide-react"

type ResultRow = {
  email: string
  role: "ADMIN" | "PARTICIPANT"
  status: "invited" | "skipped" | "error"
  message?: string
  inviteCode?: string
}

export function BulkInviteDialog({ slug }: { slug: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [defaultRole, setDefaultRole] = useState<"ADMIN" | "PARTICIPANT">("PARTICIPANT")
  const [text, setText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState<ResultRow[] | null>(null)

  const applyDefaultRole = (raw: string) => {
    const lines = raw.split(/\r?\n/)
    const mapped = lines.map(l => {
      const t = l.trim()
      if (!t) return t
      const parts = t.split(',').map(p => p.trim()).filter(Boolean)
      if (parts.length === 0) return ''
      const [email, roleMaybe, nameMaybe] = parts
      const role = roleMaybe === 'ADMIN' || roleMaybe === 'PARTICIPANT' ? roleMaybe : defaultRole
      return [email, role, nameMaybe].filter(Boolean).join(',')
    })
    return mapped.join('\n')
  }

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error("Paste a list of emails or CSV rows first")
      return
    }
    setIsSubmitting(true)
    setResults(null)
    try {
      const bodyText = applyDefaultRole(text)
      const res = await fetch(`/api/workspaces/${slug}/participants/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: bodyText
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to process bulk invites')
      }
      const data = await res.json()
      setResults(data.results as ResultRow[])
      toast.success(`Invited: ${data.summary.invited}, Skipped: ${data.summary.skipped}, Errors: ${data.summary.errors}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || 'Bulk invite failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const example = `alice@example.com\n bob@example.com,ADMIN\n carol@example.com,PARTICIPANT,Carol Jones`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Invite Participants</DialogTitle>
          <DialogDescription>
            Paste emails (one per line) or CSV rows: email[,role][,name]. Missing roles default below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label>Default Role</Label>
              <Select value={defaultRole} onValueChange={(v: any) => setDefaultRole(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARTICIPANT">Participant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Example:
              <pre className="mt-1 rounded bg-muted p-2 whitespace-pre-wrap">{example}</pre>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Emails or CSV</Label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={10}
              placeholder={example}
            />
          </div>

          {results && results.length > 0 && (
            <div className="space-y-2">
              <Label>Results</Label>
              <div className="max-h-48 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2">Email</th>
                      <th className="p-2">Role</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="p-2">{r.email}</td>
                        <td className="p-2">{r.role}</td>
                        <td className="p-2 capitalize">{r.status}</td>
                        <td className="p-2">{r.message || r.inviteCode || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>Close</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Inviting…' : 'Send Invites'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


