import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace, getUserWorkspaceRole } from '@/lib/workspace-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DefaultEmailsPanel, TemplatesPanel, EmailSettingsPanel } from './ClientPanels'

interface EmailsPageProps {
  params: Promise<{ slug: string }>
}

export default async function EmailsPage({ params }: EmailsPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== 'ADMIN') redirect('/workspaces')

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) redirect('/workspaces')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
        <p className="text-gray-600">Defaults, templates, and settings for workspace emails</p>
      </div>

      <Tabs defaultValue="default" className="w-full">
        <TabsList>
          <TabsTrigger value="default">Default Emails</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="default">
          <DefaultEmailsPanel slug={slug} workspaceName={workspace.name} userEmail={user.email || ''} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesPanel slug={slug} />
        </TabsContent>

        <TabsContent value="settings">
          <EmailSettingsPanel slug={slug} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
