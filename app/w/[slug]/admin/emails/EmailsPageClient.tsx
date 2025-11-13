'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DefaultEmailsPanel, TemplatesPanel, EmailSettingsPanel, AIComposerPanel } from './ClientPanels'
import type { EmailTemplate } from '@/components/emails/TemplateBrowser'

interface EmailsPageClientProps {
  slug: string
  workspaceName: string
  userEmail: string
}

export function EmailsPageClient({ slug, workspaceName, userEmail }: EmailsPageClientProps) {
  const [activeTab, setActiveTab] = useState('default')
  const [templateToLoad, setTemplateToLoad] = useState<EmailTemplate | null>(null)

  const handleOpenInAI = (templateData: any) => {
    // Convert template data to EmailTemplate format
    const template: EmailTemplate = {
      id: templateData.id || crypto.randomUUID(),
      name: templateData.name,
      description: templateData.description,
      type: templateData.type,
      subject: templateData.subject,
      html: templateData.html,
      enabled: templateData.enabled,
      generatedByAI: templateData.generatedByAI || false,
      aiModel: templateData.aiModel || null,
      tags: templateData.tags || [],
      version: templateData.version || 1,
      updatedAt: templateData.updatedAt || new Date().toISOString(),
      conversationHistory: templateData.conversationHistory,
    }

    setTemplateToLoad(template)
    setActiveTab('ai-composer')
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Clear template when switching away from AI Composer
    if (value !== 'ai-composer') {
      setTemplateToLoad(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
        <p className="text-gray-600">Defaults, templates, and settings for workspace emails</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="default">Default Emails</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="ai-composer">AI Composer</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="default">
          <DefaultEmailsPanel slug={slug} workspaceName={workspaceName} userEmail={userEmail} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesPanel slug={slug} userEmail={userEmail} onOpenInAI={handleOpenInAI} />
        </TabsContent>

        <TabsContent value="ai-composer">
          <AIComposerPanel
            slug={slug}
            workspaceName={workspaceName}
            initialTemplate={templateToLoad}
          />
        </TabsContent>

        <TabsContent value="settings">
          <EmailSettingsPanel slug={slug} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
