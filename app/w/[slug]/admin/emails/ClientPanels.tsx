"use client"

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { SplitViewEditor } from '@/components/emails/split-view-editor'
import { ChevronDown, ChevronUp } from 'lucide-react'

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

export function TemplatesPanel({ slug, userEmail }: { slug: string; userEmail: string }) {
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [workspaceInfo, setWorkspaceInfo] = useState<{ name: string; brandColor?: string } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState<string | null>(null)
  const [testEmails, setTestEmails] = useState<Record<string, string>>({})
  const [editState, setEditState] = useState<Record<string, { subject: string; html: string; enabled: boolean }>>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${slug}/emails/templates`)
      const data = await res.json()
      setTemplates(data.templates || [])

      // Load initial edit state
      const initialState: Record<string, { subject: string; html: string; enabled: boolean }> = {}
      const initialTestEmails: Record<string, string> = {}
      data.templates?.forEach((t: TemplateRow) => {
        initialState[t.type] = {
          subject: t.subject ?? '',
          html: t.html ?? '',
          enabled: t.enabled
        }
        initialTestEmails[t.type] = userEmail
      })
      setEditState(initialState)
      setTestEmails(initialTestEmails)
    } catch (e) {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const loadWorkspaceInfo = async () => {
    try {
      const res = await fetch(`/api/workspaces/${slug}/emails/settings`)
      const data = await res.json()
      setWorkspaceInfo({
        name: data.settings?.fromName || slug,
        brandColor: data.settings?.brandColor || '#F97316'
      })
    } catch (e) {
      // Fallback to basic info
      setWorkspaceInfo({ name: slug })
    }
  }

  useEffect(() => {
    load()
    loadWorkspaceInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const toggleExpanded = (type: string) => {
    setExpandedTemplate(expandedTemplate === type ? null : type)
  }

  const updateEditState = (type: string, field: 'subject' | 'html' | 'enabled', value: string | boolean) => {
    setEditState(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }))
  }

  const save = async (type: TemplateRow['type']) => {
    setSaving(type)
    try {
      const state = editState[type]
      const res = await fetch(`/api/workspaces/${slug}/emails/templates/${type.toLowerCase()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: state.subject,
          html: state.html,
          enabled: state.enabled
        })
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success(`${type} template saved`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save template')
    } finally {
      setSaving(null)
    }
  }

  const sendTestEmail = async (type: TemplateRow['type']) => {
    setSendingTest(type)
    try {
      const state = editState[type]
      const testEmail = testEmails[type]

      if (!testEmail) {
        toast.error('Please enter a test email address')
        return
      }

      const res = await fetch(`/api/workspaces/${slug}/emails/templates/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: state.subject,
          html: state.html,
          templateType: type
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send test email')
      }

      const data = await res.json()
      toast.success(`Test email sent to ${data.sentTo}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send test email')
    } finally {
      setSendingTest(null)
    }
  }

  return (
    <div className="space-y-4">
      {types.map(type => {
        const row = getRow(type)
        const isExpanded = expandedTemplate === type
        const state = editState[type] || { subject: row.subject ?? '', html: row.html ?? '', enabled: row.enabled }
        const isSaving = saving === type

        return (
          <Card key={type}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <span>{type}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(type)}
                      className="h-8"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Edit Template
                        </>
                      )}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Override subject and body to customize this email for the workspace.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Enabled</span>
                  <Switch
                    checked={state.enabled}
                    onCheckedChange={(checked) => updateEditState(type, 'enabled', checked)}
                  />
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">Subject</label>
                  <Input
                    value={state.subject}
                    onChange={e => updateEditState(type, 'subject', e.target.value)}
                    placeholder={`Subject for ${type}`}
                  />
                </div>
                <SplitViewEditor
                  value={state.html}
                  onChange={(html) => updateEditState(type, 'html', html)}
                  workspaceSlug={slug}
                  templateType={type}
                  workspaceName={workspaceInfo?.name}
                  brandColor={workspaceInfo?.brandColor}
                  subject={state.subject}
                />
                <div className="border-t pt-4">
                  <div className="flex items-end gap-2 mb-4">
                    <div className="flex-1">
                      <label className="text-sm text-gray-600 block mb-2">Send test email to</label>
                      <Input
                        type="email"
                        value={testEmails[type] || ''}
                        onChange={(e) => setTestEmails(prev => ({ ...prev, [type]: e.target.value }))}
                        placeholder="you@example.com"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => sendTestEmail(type)}
                      disabled={sendingTest === type || !testEmails[type]}
                    >
                      {sendingTest === type ? 'Sending...' : 'Send Test Email'}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => save(type)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Template'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
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


