"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CoralButton } from "@/components/ui/coral-button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Upload, FileUp, CheckCircle2, XCircle, AlertCircle, Mail } from "lucide-react"

type ParsedEmail = {
  email: string
  name?: string
  isValid: boolean
  error?: string
}

type ResultRow = {
  email: string
  role: "ADMIN" | "PARTICIPANT"
  status: "invited" | "skipped" | "error"
  message?: string
  inviteCode?: string
}

interface BulkInvitePanelProps {
  slug: string
  onClose: () => void
}

const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

const parseCSVLine = (line: string): ParsedEmail | null => {
  const trimmed = line.trim()
  if (!trimmed) return null

  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return null

  const [first, second] = parts

  // Check if first part is an email
  if (validateEmail(first)) {
    return {
      email: first,
      name: second || undefined,
      isValid: true
    }
  }

  // Check if second part is an email (Name, Email format)
  if (second && validateEmail(second)) {
    return {
      email: second,
      name: first,
      isValid: true
    }
  }

  return {
    email: first,
    isValid: false,
    error: "Invalid email format"
  }
}

export function BulkInvitePanel({ slug, onClose }: BulkInvitePanelProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState("")
  const [parsedEmails, setParsedEmails] = useState<ParsedEmail[]>([])
  const [showParsed, setShowParsed] = useState(false)
  const [customMessage, setCustomMessage] = useState("")
  const [showCustomMessage, setShowCustomMessage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState<ResultRow[] | null>(null)

  const handleParse = () => {
    const lines = text.split(/\r?\n/)
    const parsed = lines
      .map(parseCSVLine)
      .filter((p): p is ParsedEmail => p !== null)

    setParsedEmails(parsed)
    setShowParsed(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setText(content)
      // Auto-parse after file upload
      setTimeout(() => {
        const lines = content.split(/\r?\n/)
        const parsed = lines
          .map(parseCSVLine)
          .filter((p): p is ParsedEmail => p !== null)

        setParsedEmails(parsed)
        setShowParsed(true)
      }, 100)
    }
    reader.readAsText(file)
  }

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error("Please enter emails or upload a CSV file")
      return
    }

    setIsSubmitting(true)
    setResults(null)

    try {
      const res = await fetch(`/api/workspaces/${slug}/participants/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text
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

  const validEmails = parsedEmails.filter(e => e.isValid)
  const invalidEmails = parsedEmails.filter(e => !e.isValid)

  const example = `alice@example.com\nbob@example.com\ncarol@example.com, Carol Jones`

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emails">Paste Emails or CSV</Label>
            <Textarea
              id="emails"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setShowParsed(false)
              }}
              rows={12}
              placeholder={example}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Format: One email per line or CSV (Email, Name)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <FileUp className="h-4 w-4 mr-2" />
              Upload CSV File
            </Button>
            <Button
              variant="outline"
              onClick={handleParse}
              disabled={!text.trim()}
              className="flex-1"
            >
              Parse & Preview
            </Button>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customMessage"
                checked={showCustomMessage}
                onCheckedChange={(checked) => setShowCustomMessage(checked as boolean)}
                disabled={isSubmitting}
              />
              <Label htmlFor="customMessage" className="text-sm font-normal cursor-pointer">
                Add custom welcome message
              </Label>
            </div>

            {showCustomMessage && (
              <div className="space-y-2">
                <Label htmlFor="message">Custom Welcome Message</Label>
                <Textarea
                  id="message"
                  placeholder="Welcome to our workspace! We're excited to have you join us..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview/Stats */}
        <div className="space-y-4">
          {showParsed && parsedEmails.length > 0 && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{parsedEmails.length}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{validEmails.length}</p>
                      <p className="text-xs text-gray-500">Valid</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{invalidEmails.length}</p>
                      <p className="text-xs text-gray-500">Invalid</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Email Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-auto space-y-1">
                    {parsedEmails.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          item.isValid ? 'bg-green-50' : 'bg-red-50'
                        }`}
                      >
                        {item.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.email}</p>
                          {item.name && (
                            <p className="text-xs text-gray-600">{item.name}</p>
                          )}
                          {item.error && (
                            <p className="text-xs text-red-600">{item.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!showParsed && (
            <Card className="border-2 border-dashed">
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">Paste emails or upload a CSV file</p>
                  <p className="text-xs mt-1">Then click "Parse & Preview" to validate</p>
                </div>
              </CardContent>
            </Card>
          )}

          {showCustomMessage && customMessage && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 font-medium mb-1">Custom message preview:</p>
                    <p className="text-sm text-gray-700">{customMessage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Results Section */}
      {results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
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
                      <td className="p-2">
                        <Badge
                          variant={
                            r.status === 'invited' ? 'default' :
                            r.status === 'skipped' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-gray-600">{r.message || r.inviteCode || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <CoralButton
          onClick={handleSubmit}
          disabled={isSubmitting || !text.trim() || (showParsed && validEmails.length === 0)}
          variant="default"
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Invites...
            </>
          ) : (
            <>
              {showParsed && validEmails.length > 0
                ? `Send Invites (${validEmails.length})`
                : "Send Invites"
              }
            </>
          )}
        </CoralButton>
      </div>

      {showParsed && invalidEmails.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-amber-900">
              {invalidEmails.length} invalid email{invalidEmails.length !== 1 ? 's' : ''} detected
            </p>
            <p className="text-amber-700">
              Only valid emails will be processed when you submit
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
