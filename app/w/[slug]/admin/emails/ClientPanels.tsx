"use client"

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

export function DefaultEmailsPanel({ slug, workspaceName, userEmail }: { slug: string; workspaceName: string; userEmail: string }) {
  const [toEmail, setToEmail] = useState(userEmail)
  const [sending, setSending] = useState(false)
  const tokens = useMemo(() => ([
    '{{workspace.name}}',
    '{{invite_url}}',
    '{{role}}',
    '{{expires_at}}'
  ]), [])

  const sendTest = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/workspaces/${slug}/emails/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail })
      })
      if (!res.ok) throw new Error('Failed to send test email')
      toast.success('Test email sent')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send test')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Default Emails</CardTitle>
        <CardDescription>Preview available tokens and send a test email</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Available tokens:</p>
          <div className="flex flex-wrap gap-2">
            {tokens.map(t => (
              <span key={t} className="text-xs px-2 py-1 bg-gray-100 rounded border border-gray-200">{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-sm text-gray-600">Send test to</label>
            <Input value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button onClick={sendTest} disabled={sending || !toEmail}>{sending ? 'Sending…' : 'Send Test'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export type TemplateRow = {
  type: 'INVITE' | 'EMAIL_RESENT' | 'ENROLLMENT_UPDATE' | 'REMINDER' | 'GENERIC'
  subject: string | null
  html: string | null
  enabled: boolean
  updatedAt: string
}

export function TemplatesPanel({ slug }: { slug: string }) {
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${slug}/emails/templates`)
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (e) {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const types: TemplateRow['type'][] = ['INVITE', 'EMAIL_RESENT', 'ENROLLMENT_UPDATE', 'REMINDER', 'GENERIC']

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">Loading…</CardContent>
      </Card>
    )
  }

  const getRow = (t: TemplateRow['type']): TemplateRow => {
    const found = templates?.find(r => r.type === t)
    return found || { type: t, subject: null, html: null, enabled: false, updatedAt: new Date().toISOString() }
  }

  return (
    <div className="space-y-4">
      {types.map(type => {
        const row = getRow(type)
        const [subject, setSubject] = [row.subject ?? '', (v: string) => { row.subject = v }]
        const [html, setHtml] = [row.html ?? '', (v: string) => { row.html = v }]
        const [enabled, setEnabled] = [row.enabled, (v: boolean) => { row.enabled = v }]

        const save = async () => {
          try {
            const res = await fetch(`/api/workspaces/${slug}/emails/templates/${type.toLowerCase()}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subject: row.subject, html: row.html, enabled: row.enabled })
            })
            if (!res.ok) throw new Error('Save failed')
            toast.success(`${type} template saved`)
            await load()
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to save template')
          }
        }

        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{type}</span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Enabled</span>
                  <Switch checked={enabled} onCheckedChange={setEnabled as any} />
                </div>
              </CardTitle>
              <CardDescription>Override subject and body to customize this email for the workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Subject</label>
                <Input defaultValue={subject} onChange={e => setSubject(e.target.value)} placeholder={`Subject for ${type}`} />
              </div>
              <div>
                <label className="text-sm text-gray-600">HTML</label>
                <Textarea defaultValue={html} onChange={e => setHtml(e.target.value)} placeholder="HTML content with tokens like {{workspace.name}}" rows={8} />
              </div>
              <div className="flex justify-end">
                <Button onClick={save}>Save</Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function EmailSettingsPanel({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true)
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [brandColor, setBrandColor] = useState('')
  const [footerHtml, setFooterHtml] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${slug}/emails/settings`)
      const data = await res.json()
      const s = data.settings || {}
      setFromName(s.fromName || '')
      setFromEmail(s.fromEmail || '')
      setReplyTo(s.replyTo || '')
      setBrandColor(s.brandColor || '')
      setFooterHtml(s.footerHtml || '')
    } catch (e) {
      toast.error('Failed to load email settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    try {
      const res = await fetch(`/api/workspaces/${slug}/emails/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromName, fromEmail, replyTo, brandColor, footerHtml })
      })
      if (!res.ok) throw new Error('Failed to save settings')
      toast.success('Email settings saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">Loading…</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Settings</CardTitle>
        <CardDescription>From name/email, reply-to, footer, and brand colors</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm text-gray-600">From name</label>
          <Input value={fromName} onChange={e => setFromName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-gray-600">From email</label>
          <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-gray-600">Reply-to</label>
          <Input value={replyTo} onChange={e => setReplyTo(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-gray-600">Brand color</label>
          <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} placeholder="#F97316" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Footer HTML</label>
          <Textarea value={footerHtml} onChange={e => setFooterHtml(e.target.value)} rows={4} />
        </div>
        <div className="flex justify-end">
          <Button onClick={save}>Save Settings</Button>
        </div>
      </CardContent>
    </Card>
  )
}


