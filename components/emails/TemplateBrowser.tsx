'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bot, FileText, Plus, Search, SlidersHorizontal } from 'lucide-react'
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

type SortOption = 'recent' | 'name-asc' | 'name-desc' | 'type'
type SourceFilter = 'all' | 'ai' | 'traditional'

export function TemplateBrowser({
  workspaceSlug,
  onLoadTemplate,
  onStartBlank,
}: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [showFilters, setShowFilters] = useState(false)

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

  useEffect(() => {
    loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Get unique tags from all templates
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    templates.forEach(template => {
      template.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [templates])

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let result = [...templates]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(template => {
        return (
          (template.name?.toLowerCase().includes(query)) ||
          (template.description?.toLowerCase().includes(query)) ||
          (template.type?.toLowerCase().includes(query)) ||
          (template.tags?.some(tag => tag.toLowerCase().includes(query)))
        )
      })
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(template => template.type === typeFilter)
    }

    // Source filter
    if (sourceFilter === 'ai') {
      result = result.filter(template => template.generatedByAI)
    } else if (sourceFilter === 'traditional') {
      result = result.filter(template => !template.generatedByAI)
    }

    // Tag filter
    if (tagFilter !== 'all') {
      result = result.filter(template => template.tags.includes(tagFilter))
    }

    // Sort
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        break
      case 'name-desc':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
        break
      case 'type':
        result.sort((a, b) => a.type.localeCompare(b.type))
        break
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
    }

    return result
  }, [templates, searchQuery, typeFilter, sourceFilter, tagFilter, sortBy])

  // Group templates by type when no search is active
  const groupedTemplates = useMemo(() => {
    if (searchQuery || typeFilter !== 'all' || sourceFilter !== 'all' || tagFilter !== 'all') {
      return { flat: filteredTemplates }
    }

    const groups: Record<string, EmailTemplate[]> = {}
    filteredTemplates.forEach(template => {
      if (!groups[template.type]) {
        groups[template.type] = []
      }
      groups[template.type].push(template)
    })
    return groups
  }, [filteredTemplates, searchQuery, typeFilter, sourceFilter, tagFilter])

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

  const hasActiveFilters = typeFilter !== 'all' || sourceFilter !== 'all' || tagFilter !== 'all'

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
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-3">
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

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showFilters ? 'Hide' : 'Show'} Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  {[typeFilter !== 'all', sourceFilter !== 'all', tagFilter !== 'all'].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter('all')
                  setSourceFilter('all')
                  setTagFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
              {/* Type Filter */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="INVITE">Invite</SelectItem>
                    <SelectItem value="EMAIL_RESENT">Email Resent</SelectItem>
                    <SelectItem value="ENROLLMENT_UPDATE">Enrollment Update</SelectItem>
                    <SelectItem value="REMINDER">Reminder</SelectItem>
                    <SelectItem value="GENERIC">Generic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Source Filter */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Source</label>
                <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="ai">AI Generated</SelectItem>
                    <SelectItem value="traditional">Traditional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tag Filter */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tag</label>
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No templates match your filters</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setSearchQuery('')
                setTypeFilter('all')
                setSourceFilter('all')
                setTagFilter('all')
              }}
            >
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      ) : 'flat' in groupedTemplates ? (
        // Flat list when filters are active
        <div className="space-y-3">
          {groupedTemplates.flat.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onLoad={() => onLoadTemplate?.(template)}
              formatDate={formatDate}
            />
          ))}
        </div>
      ) : (
        // Grouped by type when no filters
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {type.replace(/_/g, ' ')}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {typeTemplates.length}
                </Badge>
              </div>
              <div className="grid gap-3">
                {typeTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onLoad={() => onLoadTemplate?.(template)}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          ))}
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
