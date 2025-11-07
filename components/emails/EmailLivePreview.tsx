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
            <div className="border rounded-lg bg-white">
              {html ? (
                <iframe
                  srcDoc={html}
                  className="w-full h-[500px] rounded-lg"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="p-10 text-center text-muted-foreground italic">
                  Email preview will appear here...
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
