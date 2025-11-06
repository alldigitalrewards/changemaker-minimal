'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Bot, FileText, Plus, Search } from 'lucide-react'
import { EmailTemplateType } from '@prisma/client'

export interface EmailTemplate {
  id: string
  name: string | null
  description: string | null
  type: EmailTemplateType
  subject: string | null
  html: string | null
  enabled: boolean
  generatedByAI: boolean
  aiModel: string | null
  tags: string[]
  version: number
  updatedAt: string
  conversationHistory?: any
}

interface TemplateBrowserProps {
  workspaceSlug: string
  onLoadTemplate?: (template: EmailTemplate) => void
  onStartBlank?: () => void
}

export function TemplateBrowser({
  workspaceSlug,
  onLoadTemplate,
  onStartBlank,
}: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Load templates on mount
  const loadTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/emails/templates/ai-list`)
      if (!res.ok) throw new Error('Failed to load templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter templates based on search
  const filteredTemplates = templates.filter(template => {
    const query = searchQuery.toLowerCase()
    return (
      (template.name?.toLowerCase().includes(query)) ||
      (template.description?.toLowerCase().includes(query)) ||
      (template.type?.toLowerCase().includes(query)) ||
      (template.tags?.some(tag => tag.toLowerCase().includes(query)))
    )
  })

  // Group templates by AI-generated vs traditional
  const aiTemplates = filteredTemplates.filter(t => t.generatedByAI)
  const traditionalTemplates = filteredTemplates.filter(t => !t.generatedByAI)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {/* Quick Start Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start</CardTitle>
          <CardDescription>Create a new template or load an existing one</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={onStartBlank} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Start from Blank
          </Button>
          <Button variant="outline" className="flex-1" disabled={templates.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            Load Template
          </Button>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates by name, type, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates List */}
      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading templates...
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Get started by creating your first template using the AI Composer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* AI-Generated Templates */}
          {aiTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  AI-Generated Templates
                </h3>
              </div>
              <div className="grid gap-3">
                {aiTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onLoad={() => onLoadTemplate?.(template)}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Traditional Templates */}
          {traditionalTemplates.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Traditional Templates
              </h3>
              <div className="grid gap-3">
                {traditionalTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onLoad={() => onLoadTemplate?.(template)}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {filteredTemplates.length === 0 && searchQuery && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No templates match your search
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

interface TemplateCardProps {
  template: EmailTemplate
  onLoad: () => void
  formatDate: (date: string) => string
}

function TemplateCard({ template, onLoad, formatDate }: TemplateCardProps) {
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onLoad}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">
                {template.name || `${template.type} Template`}
              </h4>
              {template.generatedByAI && (
                <Badge variant="secondary" className="shrink-0">
                  <Bot className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
              {!template.enabled && (
                <Badge variant="outline" className="shrink-0">
                  Disabled
                </Badge>
              )}
            </div>

            {template.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {template.description}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {template.type}
              </Badge>
              {template.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Updated {formatDate(template.updatedAt)}
              {template.version > 1 && ` • v${template.version}`}
            </p>
          </div>

          <Button size="sm" onClick={(e) => { e.stopPropagation(); onLoad(); }}>
            Load
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
