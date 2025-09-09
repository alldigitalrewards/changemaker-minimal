'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityTemplate, ActivityType, ACTIVITY_TYPES } from '@/lib/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { FileText, Image, Link, Video, CheckSquare, Upload } from 'lucide-react'

interface ActivityTemplateFormProps {
  children: React.ReactNode
  workspace: { id: string, name: string, slug: string }
  template?: ActivityTemplate
}

const activityTypeIcons = {
  TEXT_SUBMISSION: FileText,
  PHOTO_UPLOAD: Image,
  FILE_UPLOAD: Upload,
  LINK_SUBMISSION: Link,
  VIDEO_SUBMISSION: Video,
  MULTIPLE_CHOICE: CheckSquare,
}

const activityTypeLabels = {
  TEXT_SUBMISSION: 'Text Response',
  PHOTO_UPLOAD: 'Photo Upload',
  FILE_UPLOAD: 'File Upload', 
  LINK_SUBMISSION: 'Link Submission',
  VIDEO_SUBMISSION: 'Video Upload',
  MULTIPLE_CHOICE: 'Multiple Choice',
}

const activityTypeDescriptions = {
  TEXT_SUBMISSION: 'Participants submit written responses or reflections',
  PHOTO_UPLOAD: 'Participants upload photos or images',
  FILE_UPLOAD: 'Participants upload documents, presentations, or other files',
  LINK_SUBMISSION: 'Participants share links to external content or social media',
  VIDEO_SUBMISSION: 'Participants upload video responses or recordings',
  MULTIPLE_CHOICE: 'Participants answer multiple choice questions',
}

export default function ActivityTemplateForm({ children, workspace, template }: ActivityTemplateFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    type: template?.type || 'TEXT_SUBMISSION' as ActivityType,
    basePoints: template?.basePoints || 10,
    requiresApproval: template?.requiresApproval ?? true,
    allowMultiple: template?.allowMultiple ?? false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = template 
        ? `/api/workspaces/${workspace.slug}/activity-templates/${template.id}`
        : `/api/workspaces/${workspace.slug}/activity-templates`
      
      const method = template ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save template')
      }

      toast.success(template ? 'Template updated successfully' : 'Template created successfully')
      setOpen(false)
      
      // Reset form if creating new template
      if (!template) {
        setFormData({
          name: '',
          description: '',
          type: 'TEXT_SUBMISSION',
          basePoints: 10,
          requiresApproval: true,
          allowMultiple: false,
        })
      }
      
      // Refresh the page to show the new/updated template
      router.refresh()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save template')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTypeIcon = activityTypeIcons[formData.type]
  const selectedTypeLabel = activityTypeLabels[formData.type]
  const selectedTypeDescription = activityTypeDescriptions[formData.type]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Activity Template' : 'Create Activity Template'}
          </DialogTitle>
          <DialogDescription>
            {template 
              ? 'Update the activity template details'
              : 'Create a reusable activity template for your challenges'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Daily Reflection, Photo Check-in"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what participants will do for this activity..."
                rows={3}
                required
              />
            </div>
          </div>

          {/* Activity Type */}
          <div className="space-y-3">
            <Label>Activity Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: ActivityType) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    {selectedTypeIcon && React.createElement(selectedTypeIcon, { className: "h-4 w-4" })}
                    <span>{selectedTypeLabel}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((type) => {
                  const IconComponent = activityTypeIcons[type]
                  const label = activityTypeLabels[type]
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4" />
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">{selectedTypeDescription}</p>
          </div>

          {/* Points */}
          <div>
            <Label htmlFor="points">Base Points</Label>
            <Input
              id="points"
              type="number"
              min="1"
              max="1000"
              value={formData.basePoints}
              onChange={(e) => setFormData(prev => ({ ...prev, basePoints: parseInt(e.target.value) || 10 }))}
              required
            />
            <p className="text-sm text-gray-600 mt-1">
              Points awarded when this activity is completed (can be overridden per challenge)
            </p>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requires Approval</Label>
                <p className="text-sm text-gray-600">
                  Admin must review and approve submissions before points are awarded
                </p>
              </div>
              <Switch
                checked={formData.requiresApproval}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresApproval: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Multiple Submissions</Label>
                <p className="text-sm text-gray-600">
                  Participants can submit this activity multiple times
                </p>
              </div>
              <Switch
                checked={formData.allowMultiple}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowMultiple: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}