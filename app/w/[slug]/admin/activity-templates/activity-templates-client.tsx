'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, X, Search, Filter, ClipboardList, FileText, Image, Upload, Link, Video, CheckSquare, Grid3x3, List, ChevronDown, ChevronRight, DollarSign, Package, Coins, Edit, Trash2, Copy, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import ActivityTemplateForm from '@/components/activities/activity-template-form'
import ActivityTemplateCard from '@/components/activities/activity-template-card'
import { ActivityTemplate, ActivityType } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface ActivityTemplatesClientProps {
  workspace: { id: string; name: string; slug: string }
  templates: (ActivityTemplate & { _count: { Activity: number } })[]
  totalActivities: number
  activeActivities: number
  pendingSubmissions: number
}

type PanelType = 'create' | null
type ViewMode = 'grid' | 'table'
type SortField = 'name' | 'type' | 'rewardType' | 'basePoints' | 'createdAt' | 'usage'
type SortDirection = 'asc' | 'desc'

const activityTypeIcons = {
  TEXT_SUBMISSION: FileText,
  PHOTO_UPLOAD: Image,
  FILE_UPLOAD: Upload,
  LINK_SUBMISSION: Link,
  VIDEO_SUBMISSION: Video,
  MULTIPLE_CHOICE: CheckSquare,
}

const activityTypeLabels = {
  TEXT_SUBMISSION: 'Text',
  PHOTO_UPLOAD: 'Photo',
  FILE_UPLOAD: 'File',
  LINK_SUBMISSION: 'Link',
  VIDEO_SUBMISSION: 'Video',
  MULTIPLE_CHOICE: 'Quiz',
}

export function ActivityTemplatesClient({
  workspace,
  templates,
  totalActivities,
  activeActivities,
  pendingSubmissions,
}: ActivityTemplatesClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [rewardFilter, setRewardFilter] = useState<string>('all')
  const [usageFilter, setUsageFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const togglePanel = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel)
  }

  const toggleRowExpanded = (templateId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId)
    } else {
      newExpanded.add(templateId)
    }
    setExpandedRows(newExpanded)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-gray-900" />
    ) : (
      <ArrowDown className="h-4 w-4 text-gray-900" />
    )
  }

  const handleSelectTemplate = (templateId: string, checked: boolean) => {
    const newSelected = new Set(selectedTemplates)
    if (checked) {
      newSelected.add(templateId)
    } else {
      newSelected.delete(templateId)
    }
    setSelectedTemplates(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredAndSortedTemplates.map((t) => t.id)
      setSelectedTemplates(new Set(allIds))
    } else {
      setSelectedTemplates(new Set())
    }
  }

  const handleCloneTemplate = async (template: ActivityTemplate & { _count: { Activity: number } }) => {
    try {
      const response = await fetch(`/api/workspaces/${workspace.slug}/activity-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: template.description,
          type: template.type,
          basePoints: template.basePoints,
          rewardType: (template as any).rewardType,
          rewardConfig: (template as any).rewardConfig,
          requiresApproval: template.requiresApproval,
          allowMultiple: template.allowMultiple,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to clone template')
      }

      toast({
        title: 'Template Cloned',
        description: `Successfully created a copy of "${template.name}"`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: 'Clone Failed',
        description: error instanceof Error ? error.message : 'Failed to clone template',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/workspaces/${workspace.slug}/activity-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      toast({
        title: 'Template Deleted',
        description: `Successfully deleted "${templateName}"`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete template',
        variant: 'destructive',
      })
    }
  }

  const handleExportCSV = () => {
    const headers = ['Name', 'Type', 'Reward Type', 'Points/Value', 'Approval Required', 'Allow Multiple', 'Used In Challenges', 'Created', 'Description']
    const rows = filteredAndSortedTemplates.map((template) => {
      const rewardType = (template as any).rewardType || 'points'
      return [
        template.name,
        activityTypeLabels[template.type],
        rewardType === 'points' ? 'Points' : rewardType === 'sku' ? 'SKU/Product' : 'Monetary',
        template.basePoints,
        template.requiresApproval ? 'Yes' : 'No',
        template.allowMultiple ? 'Yes' : 'No',
        template._count.Activity,
        new Date(template.createdAt).toLocaleDateString(),
        template.description || '',
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-templates-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Export Successful',
      description: `Exported ${filteredAndSortedTemplates.length} templates to CSV`,
    })
  }

  // Filter and sort templates
  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = typeFilter === 'all' || template.type === typeFilter

      const matchesReward =
        rewardFilter === 'all' ||
        (template as any).rewardType === rewardFilter

      const matchesUsage =
        usageFilter === 'all' ||
        (usageFilter === 'unused' && template._count.Activity === 0) ||
        (usageFilter === 'used' && template._count.Activity > 0)

      return matchesSearch && matchesType && matchesReward && matchesUsage
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'type':
          aVal = activityTypeLabels[a.type]
          bVal = activityTypeLabels[b.type]
          break
        case 'rewardType':
          aVal = (a as any).rewardType || 'points'
          bVal = (b as any).rewardType || 'points'
          break
        case 'basePoints':
          aVal = a.basePoints
          bVal = b.basePoints
          break
        case 'usage':
          aVal = a._count.Activity
          bVal = b._count.Activity
          break
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [templates, searchQuery, typeFilter, rewardFilter, usageFilter, sortField, sortDirection])

  const clearAllFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setRewardFilter('all')
    setUsageFilter('all')
  }

  const hasActiveFilters = searchQuery !== '' || typeFilter !== 'all' || rewardFilter !== 'all' || usageFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Templates</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage reusable activity templates for your challenges
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Button */}
          {filteredAndSortedTemplates.length > 0 && (
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          {/* View Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
              title="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 w-8 p-0"
              title="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => togglePanel('create')}
            className="bg-gray-900 hover:bg-gray-800"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Templates</div>
                <div className="text-3xl font-bold text-gray-900">{templates.length}</div>
              </div>
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-700 mb-1">Total Activities</div>
                <div className="text-3xl font-bold text-blue-900">{totalActivities}</div>
                <div className="text-xs text-blue-600 mt-1">Across all challenges</div>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-700 mb-1">Active</div>
                <div className="text-3xl font-bold text-green-900">{activeActivities}</div>
                <div className="text-xs text-green-600 mt-1">Currently available</div>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-amber-700 mb-1">Pending Review</div>
                <div className="text-3xl font-bold text-amber-900">{pendingSubmissions}</div>
                <div className="text-xs text-amber-600 mt-1">Awaiting approval</div>
              </div>
              <div className="h-12 w-12 bg-amber-500 rounded-full flex items-center justify-center">
                <Filter className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center bg-white border rounded-lg p-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="TEXT_SUBMISSION">Text Response</SelectItem>
            <SelectItem value="PHOTO_UPLOAD">Photo Upload</SelectItem>
            <SelectItem value="FILE_UPLOAD">File Upload</SelectItem>
            <SelectItem value="LINK_SUBMISSION">Link Submission</SelectItem>
            <SelectItem value="VIDEO_SUBMISSION">Video Upload</SelectItem>
            <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
          </SelectContent>
        </Select>

        <Select value={rewardFilter} onValueChange={setRewardFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Rewards" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rewards</SelectItem>
            <SelectItem value="points">Points</SelectItem>
            <SelectItem value="sku">SKU/Product</SelectItem>
            <SelectItem value="monetary">Monetary</SelectItem>
          </SelectContent>
        </Select>

        <Select value={usageFilter} onValueChange={setUsageFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Templates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Templates</SelectItem>
            <SelectItem value="used">Used Only</SelectItem>
            <SelectItem value="unused">Unused Only</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          {typeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Type: {activityTypeLabels[typeFilter as ActivityType] || typeFilter}
              <button
                onClick={() => setTypeFilter('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {rewardFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Reward: {rewardFilter}
              <button
                onClick={() => setRewardFilter('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {usageFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Usage: {usageFilter === 'used' ? 'Used Only' : 'Unused Only'}
              <button
                onClick={() => setUsageFilter('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: "{searchQuery}"
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
          >
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Create Template Panel */}
      {activePanel === 'create' && (
        <Card className="border-gray-300 bg-gradient-to-br from-gray-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Create Activity Template</CardTitle>
                <CardDescription>
                  Build a reusable template to use across multiple challenges
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActivePanel(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityTemplateForm
              workspace={workspace}
              inline={true}
              forceCreate={true}
              onSaved={() => {
                setActivePanel(null)
                router.refresh()
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Templates Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Templates</CardTitle>
              <CardDescription>
                {filteredAndSortedTemplates.length} of {templates.length} templates
                {hasActiveFilters && ' (filtered)'}
                {selectedTemplates.size > 0 && ` • ${selectedTemplates.size} selected`}
              </CardDescription>
            </div>
            {selectedTemplates.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTemplates(new Set())}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedTemplates.length === 0 ? (
            <div className="text-center py-12">
              {templates.length === 0 ? (
                <>
                  <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No activity templates yet
                  </h3>
                  <p className="text-gray-600 mb-4 max-w-md mx-auto">
                    Create your first activity template to get started. Templates can be reused across multiple challenges.
                  </p>
                  <Button onClick={() => togglePanel('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Template
                  </Button>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No templates match your filters
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedTemplates.map((template) => (
                <ActivityTemplateCard
                  key={template.id}
                  template={template}
                  workspace={workspace}
                />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedTemplates.size > 0 &&
                            filteredAndSortedTemplates.every((t) => selectedTemplates.has(t.id))
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[300px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('name')}
                        >
                          Template Name
                          {getSortIcon('name')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('type')}
                        >
                          Type
                          {getSortIcon('type')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('rewardType')}
                        >
                          Reward Type
                          {getSortIcon('rewardType')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px] text-right">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900 ml-auto"
                          onClick={() => handleSort('basePoints')}
                        >
                          Value
                          {getSortIcon('basePoints')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('usage')}
                        >
                          Usage
                          {getSortIcon('usage')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[100px]">Approval</TableHead>
                      <TableHead className="w-[120px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('createdAt')}
                        >
                          Created
                          {getSortIcon('createdAt')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedTemplates.map((template) => {
                      const isExpanded = expandedRows.has(template.id)
                      const TypeIcon = activityTypeIcons[template.type]
                      const rewardType = (template as any).rewardType || 'points'
                      const rewardConfig = (template as any).rewardConfig || {}
                      const isHovered = hoveredRow === template.id
                      const isUnused = template._count.Activity === 0

                      return (
                        <React.Fragment key={template.id}>
                          <TableRow
                            className={`cursor-pointer transition-colors ${
                              isUnused
                                ? 'hover:bg-amber-50'
                                : 'hover:bg-gray-50'
                            } ${isUnused ? 'bg-amber-50/30' : ''}`}
                            onClick={() => toggleRowExpanded(template.id)}
                            onMouseEnter={() => setHoveredRow(template.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                                <Checkbox
                                  checked={selectedTemplates.has(template.id)}
                                  onCheckedChange={(checked) =>
                                    handleSelectTemplate(template.id, checked as boolean)
                                  }
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                  {template.name}
                                  {isUnused && (
                                    <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                                      Unused
                                    </Badge>
                                  )}
                                </div>
                                {template.description && (
                                  <div className="text-xs text-gray-500 line-clamp-1 max-w-xs">
                                    {template.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-gray-600" />
                                <span className="text-sm">{activityTypeLabels[template.type]}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {rewardType === 'points' ? (
                                  <>
                                    <Coins className="h-4 w-4 text-amber-600" />
                                    <span className="text-sm">Points</span>
                                  </>
                                ) : rewardType === 'sku' ? (
                                  <>
                                    <Package className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm">SKU</span>
                                  </>
                                ) : (
                                  <>
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    <span className="text-sm">Money</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {rewardType === 'points' && (
                                <span className="text-amber-700">{template.basePoints} pts</span>
                              )}
                              {rewardType === 'sku' && (
                                <span className="text-blue-700">{template.basePoints} items</span>
                              )}
                              {rewardType === 'monetary' && (
                                <span className="text-green-700">${template.basePoints}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">
                                  {template._count.Activity}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {template._count.Activity === 1 ? 'challenge' : 'challenges'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={template.requiresApproval ? 'default' : 'secondary'}>
                                {template.requiresApproval ? 'Required' : 'Auto'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {new Date(template.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className={`flex gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleCloneTemplate(template)}
                                  title="Clone template"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Edit template"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDeleteTemplate(template.id, template.name)}
                                  title="Delete template"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expandable Row Details */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-gray-50 border-t">
                                <div className="py-4 px-2 space-y-4">
                                  {/* Main Details Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Template Info */}
                                    <div>
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Template Details
                                      </div>
                                      <div className="space-y-1.5">
                                        <div className="text-xs">
                                          <span className="font-medium">Name:</span>{' '}
                                          <span className="text-gray-600">{template.name}</span>
                                        </div>
                                        <div className="text-xs">
                                          <span className="font-medium">Type:</span>{' '}
                                          <Badge variant="secondary" className="ml-1">
                                            {activityTypeLabels[template.type]}
                                          </Badge>
                                        </div>
                                        {template.description && (
                                          <div className="text-xs">
                                            <span className="font-medium">Description:</span>{' '}
                                            <p className="text-gray-600 mt-1">{template.description}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Reward Configuration */}
                                    <div>
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Reward Configuration
                                      </div>
                                      <div className="space-y-1.5">
                                        <div className="text-xs">
                                          <span className="font-medium">Type:</span>{' '}
                                          <Badge variant="secondary" className="ml-1">
                                            {rewardType === 'points' ? 'Points' : rewardType === 'sku' ? 'SKU/Product' : 'Monetary'}
                                          </Badge>
                                        </div>
                                        <div className="text-xs">
                                          <span className="font-medium">Base Value:</span>{' '}
                                          <span className="text-gray-900 font-semibold">
                                            {template.basePoints} {rewardType === 'points' ? 'pts' : rewardType === 'sku' ? 'items' : 'USD'}
                                          </span>
                                        </div>
                                        {rewardType === 'sku' && rewardConfig.skuId && (
                                          <>
                                            <div className="text-xs">
                                              <span className="font-medium">SKU:</span>{' '}
                                              <code className="text-gray-600 font-mono text-[10px]">
                                                {rewardConfig.skuId}
                                              </code>
                                            </div>
                                            {rewardConfig.productName && (
                                              <div className="text-xs">
                                                <span className="font-medium">Product:</span>{' '}
                                                <span className="text-gray-600">{rewardConfig.productName}</span>
                                              </div>
                                            )}
                                            {rewardConfig.productValue && (
                                              <div className="text-xs">
                                                <span className="font-medium">Value:</span>{' '}
                                                <span className="text-gray-600">
                                                  ${(rewardConfig.productValue / 100).toFixed(2)}
                                                </span>
                                              </div>
                                            )}
                                          </>
                                        )}
                                        {rewardType === 'monetary' && rewardConfig.amount && (
                                          <div className="text-xs">
                                            <span className="font-medium">Amount:</span>{' '}
                                            <span className="text-gray-600">
                                              ${rewardConfig.amount} {rewardConfig.currency || 'USD'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Settings & Metadata */}
                                    <div>
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Settings & Metadata
                                      </div>
                                      <div className="space-y-1.5">
                                        <div className="text-xs">
                                          <span className="font-medium">Usage:</span>{' '}
                                          <span className="text-gray-900 font-semibold">
                                            {template._count.Activity} {template._count.Activity === 1 ? 'challenge' : 'challenges'}
                                          </span>
                                        </div>
                                        <div className="text-xs">
                                          <span className="font-medium">Requires Approval:</span>{' '}
                                          <Badge variant={template.requiresApproval ? 'default' : 'secondary'}>
                                            {template.requiresApproval ? 'Yes' : 'No'}
                                          </Badge>
                                        </div>
                                        <div className="text-xs">
                                          <span className="font-medium">Allow Multiple:</span>{' '}
                                          <Badge variant={template.allowMultiple ? 'default' : 'secondary'}>
                                            {template.allowMultiple ? 'Yes' : 'No'}
                                          </Badge>
                                        </div>
                                        <div className="text-xs">
                                          <span className="font-medium">Created:</span>{' '}
                                          <span className="text-gray-600">
                                            {new Date(template.createdAt).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                        {template.updatedAt && template.updatedAt !== template.createdAt && (
                                          <div className="text-xs">
                                            <span className="font-medium">Last Updated:</span>{' '}
                                            <span className="text-gray-600">
                                              {new Date(template.updatedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              })}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
