import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace, getUserWorkspaceRole } from '@/lib/workspace-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
          <Card>
            <CardHeader>
              <CardTitle>System Default Emails</CardTitle>
              <CardDescription>Preview default system emails and send test</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">TODO: Render previews for invite, password reset info, and enrollment updates. Include token examples like {{workspace.name}} and {{invite_url}}. Add test send button.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Templates</CardTitle>
              <CardDescription>Override specific email types for this workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">TODO: List and edit overrides per type (subject/body), token helper, preview, and enable/disable toggle.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>From name/email, reply-to, footer, and brand colors</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">TODO: Form to edit `from` name/email, reply-to, footer HTML, and brand color. Add DKIM/SPF guidance and domain verification checklist.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


