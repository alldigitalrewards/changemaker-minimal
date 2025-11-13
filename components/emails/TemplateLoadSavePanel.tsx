'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, FolderOpen, Plus } from 'lucide-react'
import { EmailTemplateType } from '@prisma/client'
import { toast } from 'sonner'

interface TemplateLoadSavePanelProps {
  workspaceSlug: string
  currentTemplate: {
    id?: string
    name?: string
    type: EmailTemplateType
    description?: string
  } | null
  onLoadTemplate: (templateId: string) => void
  onNewTemplate: () => void
  onSaveTemplate: (data: {
    name: string
    description: string
    type: EmailTemplateType
  }) => void
}

export function TemplateLoadSavePanel({
  workspaceSlug,
  currentTemplate,
  onLoadTemplate,
  onNewTemplate,
  onSaveTemplate,
}: TemplateLoadSavePanelProps) {
  const [templates, setTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showTemplateList, setShowTemplateList] = useState(false)

  // Template metadata form
  const [name, setName] = useState(currentTemplate?.name || '')
  const [description, setDescription] = useState(currentTemplate?.description || '')
  const [type, setType] = useState<EmailTemplateType>(currentTemplate?.type || 'GENERIC')

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/emails/templates/ai-list`)
      if (!res.ok) throw new Error('Failed to load templates')
      const data = await res.json()
      setTemplates(data.templates || [])
      setShowTemplateList(true)
    } catch (error) {
      toast.error('Failed to load templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a template name')
      return
    }
    onSaveTemplate({ name, description, type })
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template</CardTitle>
          <CardDescription>Load existing or start new</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={onNewTemplate}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
          <Button
            onClick={loadTemplates}
            className="w-full"
            variant="outline"
            disabled={loadingTemplates}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            {loadingTemplates ? 'Loading...' : 'Load Template'}
          </Button>
        </CardContent>
      </Card>

      {/* Template List (when showing) */}
      {showTemplateList && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Template</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplateList(false)}
              className="absolute top-4 right-4"
            >
              Close
            </Button>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No templates found
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onLoadTemplate(template.id)
                      setShowTemplateList(false)
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="font-medium text-sm">
                      {template.name || `${template.type} Template`}
                    </div>
                    {template.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {template.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template Details</CardTitle>
          <CardDescription>Name, type, and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              placeholder="My Email Template"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EmailTemplateType)}>
              <SelectTrigger id="template-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERIC">Generic</SelectItem>
                <SelectItem value="INVITE">Invite</SelectItem>
                <SelectItem value="EMAIL_RESENT">Email Resent</SelectItem>
                <SelectItem value="ENROLLMENT_UPDATE">Enrollment Update</SelectItem>
                <SelectItem value="REMINDER">Reminder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Brief description of this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
