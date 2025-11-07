'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye } from 'lucide-react'

interface EmailLivePreviewProps {
  subject: string
  html: string
  isGenerating?: boolean
}

export function EmailLivePreview({ subject, html, isGenerating }: EmailLivePreviewProps) {
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
              {subject || (
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
            <div className="border rounded-lg bg-white overflow-hidden">
              {html ? (
                <iframe
                  srcDoc={html}
                  className="w-full h-[500px] border-0"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                  style={{ display: 'block' }}
                />
              ) : (
                <div className="h-[500px] flex items-center justify-center text-center text-muted-foreground italic bg-muted/20">
                  <div>
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Email preview will appear here...</p>
                    <p className="text-xs mt-1">Start a conversation to generate content</p>
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
