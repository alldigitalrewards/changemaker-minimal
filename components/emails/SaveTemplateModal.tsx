'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { EmailTemplateType } from '@prisma/client'

interface SaveTemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    name: string
    type: EmailTemplateType
    description?: string
    tags: string[]
    updateExisting?: boolean
  }) => Promise<void>
  existingTemplate?: {
    id: string
    name: string | null
    type: EmailTemplateType
    description: string | null
    tags: string[]
  }
}

export function SaveTemplateModal({
  open,
  onOpenChange,
  onSave,
  existingTemplate,
}: SaveTemplateModalProps) {
  const [name, setName] = useState(existingTemplate?.name || '')
  const [type, setType] = useState<EmailTemplateType>(
    existingTemplate?.type || 'GENERIC'
  )
  const [description, setDescription] = useState(existingTemplate?.description || '')
  const [tags, setTags] = useState<string[]>(existingTemplate?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [updateMode, setUpdateMode] = useState<'new' | 'update'>(
    existingTemplate ? 'update' : 'new'
  )

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      return
    }

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        tags,
        updateExisting: existingTemplate && updateMode === 'update',
      })
      onOpenChange(false)
      // Reset form
      if (!existingTemplate || updateMode === 'new') {
        setName('')
        setDescription('')
        setTags([])
        setType('GENERIC')
      }
    } catch (error) {
      console.error('Failed to save template:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingTemplate ? 'Save Template' : 'Save as Template'}
          </DialogTitle>
          <DialogDescription>
            {existingTemplate
              ? 'Update the existing template or save as a new version'
              : 'Save your AI-generated email as a reusable template'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {existingTemplate && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={updateMode === 'update' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setUpdateMode('update')}
              >
                Update Existing
              </Button>
              <Button
                type="button"
                variant={updateMode === 'new' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setUpdateMode('new')}
              >
                Save as New
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Challenge Kickoff Invitation"
              disabled={existingTemplate && updateMode === 'update'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">
              Template Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as EmailTemplateType)}
              disabled={existingTemplate && updateMode === 'update'}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INVITE">Invite</SelectItem>
                <SelectItem value="EMAIL_RESENT">Email Resent</SelectItem>
                <SelectItem value="ENROLLMENT_UPDATE">Enrollment Update</SelectItem>
                <SelectItem value="REMINDER">Reminder</SelectItem>
                <SelectItem value="GENERIC">Generic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template's purpose"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Add a tag and press Enter"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="pl-2 pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
