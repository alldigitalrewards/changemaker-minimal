'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ActivityTemplateSelector } from './activity-template-selector'
import ActivityTemplateForm from './activity-template-form'

interface ActivityAddDialogProps {
  workspaceSlug: string
  challengeId?: string // required in api mode (edit page)
  mode?: 'api' | 'local' // local = create page
  onAdd: (activity: { templateId: string; pointsValue: number; maxSubmissions: number; deadline: string | null; isRequired: boolean; template?: any }) => void
  trigger: React.ReactNode
}

export function ActivityAddDialog({ workspaceSlug, challengeId, mode = 'api', onAdd, trigger }: ActivityAddDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'use' | 'new' | 'duplicate'>('use')
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)

  const close = () => setOpen(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[92vw] max-w-[92vw] p-6 md:p-8" style={{ width: '92vw', maxWidth: '92vw' }}>
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
          <DialogDescription>
            Use a template, create a new one, or duplicate and edit an existing template
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="use">Use Template</TabsTrigger>
            <TabsTrigger value="new">New Template</TabsTrigger>
            <TabsTrigger value="duplicate">Duplicate & Edit</TabsTrigger>
          </TabsList>

          <TabsContent value="use" className="mt-2">
            <ActivityTemplateSelector
              mode={mode}
              workspaceSlug={workspaceSlug}
              challengeId={challengeId}
              onAdd={(a) => { onAdd(a); close() }}
              onAssigned={() => close()}
            />
          </TabsContent>

          <TabsContent value="new" className="mt-2">
            <ActivityTemplateForm workspace={{ id: '', name: '', slug: workspaceSlug }}>
              <Button type="button" className="hidden" />
            </ActivityTemplateForm>
            <div className="text-sm text-gray-600 mt-3">After creating, switch to "Use Template" to configure and assign.</div>
          </TabsContent>

          <TabsContent value="duplicate" className="mt-2">
            <div className="text-sm text-gray-600 mb-3">Pick a template to start from, then save as a new template.</div>
            <ActivityTemplateSelector
              mode="local"
              workspaceSlug={workspaceSlug}
              onAdd={(a) => { setSelectedTemplate(a.template || null); setActiveTab('new') }}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={close}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


