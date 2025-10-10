'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ActivityTemplateSelector } from './activity-template-selector'
import ActivityTemplateForm from './activity-template-form'

interface ActivityAddInlineProps {
  workspaceSlug: string
  challengeId?: string // required in api mode (edit page)
  mode?: 'api' | 'local' // local = create page
  onAdd: (activity: { templateId: string; pointsValue: number; maxSubmissions: number; deadline: string | null; isRequired: boolean; template?: any }) => void
  onClose?: () => void
  onAssigned?: () => void
}

export default function ActivityAddInline({ workspaceSlug, challengeId, mode = 'api', onAdd, onClose, onAssigned }: ActivityAddInlineProps) {
  const [activeTab, setActiveTab] = useState<'use' | 'new' | 'duplicate'>('use')
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)

  return (
    <div className="border rounded-md p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Add Activity</div>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        )}
      </div>
      <div className="text-sm text-gray-600 mb-3">Use a template, create a new one, or duplicate and edit an existing template</div>

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
            onAdd={(a) => { onAdd(a); onClose && onClose() }}
            onAssigned={() => { onAssigned && onAssigned(); onClose && onClose() }}
            initialSelectedTemplateId={selectedTemplate?.id}
          />
        </TabsContent>

        <TabsContent value="new" className="mt-2">
          <ActivityTemplateForm
            inline
            workspace={{ id: '', name: '', slug: workspaceSlug }}
            initialTemplate={selectedTemplate || undefined}
            forceCreate
            onSaved={(t) => { setSelectedTemplate(t); setActiveTab('use') }}
          />
          <div className="text-sm text-gray-600 mt-3">After creating, switch to "Use Template" to configure and assign.</div>
        </TabsContent>

        <TabsContent value="duplicate" className="mt-2">
          <div className="text-sm text-gray-600 mb-3">Pick a template to start from, then save as a new template.</div>
          <ActivityTemplateSelector
            mode="local"
            workspaceSlug={workspaceSlug}
            onAdd={(a) => { setSelectedTemplate(a.template || null); setActiveTab('new') }}
          />
          {selectedTemplate && (
            <div className="mt-4">
              <div className="text-sm text-gray-700 mb-2">Editing copy of: <span className="font-medium">{selectedTemplate.name}</span></div>
              <ActivityTemplateForm
                workspace={{ id: '', name: '', slug: workspaceSlug }}
                initialTemplate={{
                  name: selectedTemplate.name,
                  description: selectedTemplate.description,
                  type: selectedTemplate.type,
                  basePoints: selectedTemplate.basePoints,
                  rewardType: selectedTemplate.rewardType,
                  rewardConfig: selectedTemplate.rewardConfig,
                  requiresApproval: selectedTemplate.requiresApproval,
                  allowMultiple: selectedTemplate.allowMultiple,
                }}
                forceCreate
              >
                <Button type="button" className="hidden" />
              </ActivityTemplateForm>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
