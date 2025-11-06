import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace, getUserWorkspaceRole } from '@/lib/workspace-context'
import { getWorkspaceActivityTemplates, getWorkspaceChallenges, getChallengeActivities } from '@/lib/db/queries'
import ActivityTemplateCard from '@/components/activities/activity-template-card'
import ActivityTemplateForm from '@/components/activities/activity-template-form'
import { WorkspaceActivitiesList } from '@/components/activities/workspace-activities-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, ClipboardList } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ActivityTemplatesPageProps {
  params: Promise<{ slug: string }>
}

export default async function ActivityTemplatesPage({ params }: ActivityTemplatesPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== 'ADMIN') {
    redirect('/workspaces')
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect('/workspaces')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
          <p className="text-gray-600">Manage activities across challenges and reusable templates</p>
        </div>
        <ActivityTemplateForm workspace={workspace}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </ActivityTemplateForm>
      </div>

      <Tabs defaultValue="activities" className="w-full">
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Suspense fallback={<ActivitiesLoading />}>
            <WorkspaceActivities workspaceId={workspace.id} workspaceSlug={workspace.slug} />
          </Suspense>
        </TabsContent>

        <TabsContent value="templates">
          <Suspense fallback={<ActivityTemplatesLoading />}>
            <ActivityTemplatesList workspace={workspace} />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Activity Settings</CardTitle>
              <CardDescription>Defaults and moderation rules (coming soon)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">TODO: Configure default points, approval policies, and moderation rules.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

async function ActivityTemplatesList({ workspace }: { workspace: { id: string, name: string, slug: string } }) {
  try {
    const templates = await getWorkspaceActivityTemplates(workspace.id)

    if (templates.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity templates yet</h3>
            <p className="text-gray-600 text-center max-w-md mb-4">
              Create your first activity template to get started. Templates can be reused across multiple challenges.
            </p>
            <ActivityTemplateForm workspace={workspace}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Template
              </Button>
            </ActivityTemplateForm>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <ActivityTemplateCard
            key={template.id}
            template={template}
            workspace={workspace}
          />
        ))}
      </div>
    )
  } catch (error) {
    console.error('Error loading activity templates:', error)
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-red-600">Error loading activity templates</p>
        </CardContent>
      </Card>
    )
  }
}

function ActivityTemplatesLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function WorkspaceActivities({ workspaceId, workspaceSlug }: { workspaceId: string; workspaceSlug: string }) {
  try {
    const challenges = await getWorkspaceChallenges(workspaceId)
    const activitiesByChallenge = await Promise.all(
      challenges.map(async (c) => ({
        challenge: c,
        activities: await getChallengeActivities(c.id, workspaceId)
      }))
    )

    return <WorkspaceActivitiesList activitiesByChallenge={activitiesByChallenge} workspaceSlug={workspaceSlug} />
  } catch (error) {
    console.error('Error loading activities:', error)
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-600">Error loading activities</CardContent>
      </Card>
    )
  }
}

function ActivitiesLoading() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-64 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((__, j) => (
                <div key={j} className="h-24 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}