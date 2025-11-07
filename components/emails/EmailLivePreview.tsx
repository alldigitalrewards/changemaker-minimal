'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye } from 'lucide-react'
import { replaceVariables, getSampleData } from '@/lib/email/template-variables'

interface EmailLivePreviewProps {
  subject: string
  html: string
  isGenerating?: boolean
  workspaceName?: string
  workspaceSlug?: string
}

export function EmailLivePreview({
  subject,
  html,
  isGenerating,
  workspaceName = 'Your Workspace',
  workspaceSlug = 'workspace'
}: EmailLivePreviewProps) {
  // Generate preview data with actual workspace context
  const previewData = useMemo(() => {
    return getSampleData({
      workspaceName,
      workspaceUrl: `http://localhost:3000/w/${workspaceSlug}`,
      actionUrl: `http://localhost:3000/w/${workspaceSlug}`,
      inviteUrl: `http://localhost:3000/w/${workspaceSlug}/invites/preview`,
      challengeUrl: `http://localhost:3000/w/${workspaceSlug}/challenges/sample`,
    })
  }, [workspaceName, workspaceSlug])

  // Replace variables in both subject and HTML with preview data
  const previewSubject = useMemo(() => {
    return subject ? replaceVariables(subject, previewData) : ''
  }, [subject, previewData])

  const previewHtml = useMemo(() => {
    if (!html) return ''
    let replacedHtml = replaceVariables(html, previewData)

    // If AI generated complete HTML with dark body background, fix it
    if (replacedHtml.includes('<!DOCTYPE') || replacedHtml.includes('<html')) {
      // Replace dark body backgrounds with light backgrounds for email preview
      replacedHtml = replacedHtml.replace(
        /(body\s*{[^}]*background-color:\s*)(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)([^}]*})/gi,
        (match, prefix, color, suffix) => {
          // Only replace if it's a dark color (simple heuristic)
          const isDark = color.includes('#000') || color.includes('#1') || color.includes('#2') ||
                        color.includes('#3') || color.includes('black') || color.includes('dark')
          return isDark ? `${prefix}#f5f5f5${suffix}` : match
        }
      )
      return replacedHtml
    }

    // Wrap in proper HTML document if not already wrapped
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
  </style>
</head>
<body>
${replacedHtml}
</body>
</html>`
  }, [html, previewData])

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Preview
          </CardTitle>
          {isGenerating && (
            <Badge variant="secondary" className="animate-pulse">
              Generating...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Subject Line */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Subject Line
            </div>
            <div className="text-sm font-medium border rounded-lg p-3 bg-muted/50">
              {previewSubject || (
                <span className="text-muted-foreground italic">
                  Subject will appear here...
                </span>
              )}
            </div>
          </div>

          {/* Email Preview */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Email Body
            </div>
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[calc(100vh-280px)] min-h-[700px] border-0"
                  title="Email Preview"
                  sandbox="allow-same-origin allow-popups"
                  style={{
                    display: 'block',
                    margin: 0,
                    padding: 0,
                    border: 'none',
                    backgroundColor: 'white'
                  }}
                />
              ) : (
                <div className="h-[calc(100vh-280px)] min-h-[700px] flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Email preview will appear here...</p>
                    <p className="text-xs mt-1 opacity-70">Start a conversation to generate content</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
