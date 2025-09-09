'use client'

import { useState } from 'react'
import { ActivityTemplate } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { MoreVertical, Edit, Trash2, FileText, Image, Link, Video, CheckSquare, Upload } from 'lucide-react'
import { toast } from 'sonner'
import ActivityTemplateForm from './activity-template-form'

interface ActivityTemplateCardProps {
  template: ActivityTemplate
  workspace: { id: string, name: string, slug: string }
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

export default function ActivityTemplateCard({ template, workspace }: ActivityTemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const IconComponent = activityTypeIcons[template.type]
  const typeLabel = activityTypeLabels[template.type]

  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/workspaces/${workspace.slug}/activity-templates/${template.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      toast.success('Template deleted successfully')
      // Trigger page refresh
      window.location.reload()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-coral-50 border border-coral-200">
                <IconComponent className="h-4 w-4 text-coral-600" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-semibold truncate">
                  {template.name}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {typeLabel}
                </Badge>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ActivityTemplateForm workspace={workspace} template={template}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                </ActivityTemplateForm>
                <DropdownMenuItem
                  className="text-red-600"
                  onSelect={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <CardDescription className="text-sm text-gray-600 mb-3 line-clamp-2">
            {template.description}
          </CardDescription>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{template.basePoints} points</span>
            <div className="flex items-center space-x-2">
              {template.requiresApproval && (
                <Badge variant="outline" className="text-xs">
                  Requires Review
                </Badge>
              )}
              {template.allowMultiple && (
                <Badge variant="outline" className="text-xs">
                  Multiple Submissions
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be undone.
              Any activities created from this template will remain in their challenges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}