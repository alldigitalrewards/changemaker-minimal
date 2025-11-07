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
    return html ? replaceVariables(html, previewData) : ''
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
                  className="w-full h-[600px] border-0"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                  style={{
                    display: 'block',
                    margin: 0,
                    padding: 0,
                    border: 'none'
                  }}
                />
              ) : (
                <div className="h-[600px] flex items-center justify-center text-center text-muted-foreground">
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
