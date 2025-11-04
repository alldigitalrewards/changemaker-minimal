import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateWorkspace, deleteWorkspace, leaveWorkspace } from "./actions"
import { setPointsBalance } from "./actions"
import { getUserBySupabaseId, getWorkspacePointsBudget, upsertWorkspacePointsBudget } from "@/lib/db/queries"
import { isWorkspaceOwner } from "@/lib/db/workspace-membership"
import { getWorkspaceEmailSettings } from "@/lib/db/queries"
import { RewardStackConfig } from "@/components/admin/rewardstack-config"

export default async function AdminSettingsPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get database user
  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) {
    redirect("/auth/login")
  }

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== "ADMIN") {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  // Check if current user is workspace owner
  const fullWorkspace = await prisma.workspace.findUnique({
    where: { id: workspace.id },
    select: {
      id: true,
      name: true,
      slug: true,
      // RewardSTACK Configuration
      rewardStackEnabled: true,
      rewardStackEnvironment: true,
      rewardStackOrgId: true,
      rewardStackProgramId: true,
      rewardStackSandboxMode: true
    }
  })

  const isOwner = await isWorkspaceOwner(dbUser.id, workspace.id)

  // Get workspace statistics
  const stats = await prisma.workspace.findUnique({
    where: { id: workspace.id },
    include: {
      _count: {
        select: {
          WorkspaceMembership: true,
          Challenge: true
        }
      }
    }
  })

  const emailSettings = await getWorkspaceEmailSettings(workspace.id)
  const budget = await getWorkspacePointsBudget(workspace.id)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workspace Settings</h1>
        <p className="text-gray-600">Manage settings for {workspace.name}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding Preview</CardTitle>
            <CardDescription>Preview header/sidebar branding for this workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="h-12 flex items-center px-4" style={{ background: emailSettings?.brandColor || '#F97316' }}>
                <span className="text-white font-semibold">{workspace.name}</span>
              </div>
              <div className="flex">
                <div className="w-48 border-r p-4">Sidebar</div>
                <div className="flex-1 p-4">
                  <div className="h-24 bg-gray-50 rounded" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles & Permissions</CardTitle>
            <CardDescription>Guardrails to prevent last-admin removal</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Admins cannot demote themselves if they are the last admin. Transfers of ownership are required to leave.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Defaults</CardTitle>
            <CardDescription>Sender details and brand color, used by all workspace emails</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={async (formData: FormData) => {
              "use server"
              const fromName = String(formData.get('fromName') || '')
              const fromEmail = String(formData.get('fromEmail') || '')
              const replyTo = String(formData.get('replyTo') || '')
              const brandColor = String(formData.get('brandColor') || '')
              const footerHtml = String(formData.get('footerHtml') || '')
              const { upsertWorkspaceEmailSettings } = await import("@/lib/db/queries")
              await upsertWorkspaceEmailSettings(workspace.id, { fromName, fromEmail, replyTo, brandColor, footerHtml }, dbUser.id)
            }} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fromName">From name</Label>
                <Input id="fromName" name="fromName" defaultValue={emailSettings?.fromName || ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fromEmail">From email</Label>
                <Input id="fromEmail" name="fromEmail" defaultValue={emailSettings?.fromEmail || ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="replyTo">Reply-to</Label>
                <Input id="replyTo" name="replyTo" defaultValue={emailSettings?.replyTo || ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brandColor">Brand color</Label>
                <Input id="brandColor" name="brandColor" defaultValue={emailSettings?.brandColor || ''} placeholder="#F97316" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="footerHtml">Footer HTML</Label>
                <Input id="footerHtml" name="footerHtml" defaultValue={emailSettings?.footerHtml || ''} />
              </div>
              <Button type="submit">Save Email Defaults</Button>
            </form>
          </CardContent>
        </Card>

        {/* RewardSTACK Integration */}
        <RewardStackConfig
          workspaceId={workspace.id}
          workspaceSlug={slug}
          initialConfig={{
            rewardStackEnabled: fullWorkspace?.rewardStackEnabled || false,
            rewardStackEnvironment: fullWorkspace?.rewardStackEnvironment || null,
            rewardStackOrgId: fullWorkspace?.rewardStackOrgId || null,
            rewardStackProgramId: fullWorkspace?.rewardStackProgramId || null,
            rewardStackSandboxMode: fullWorkspace?.rewardStackSandboxMode || true
          }}
        />

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Update your workspace information</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateWorkspace}>
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={workspace.name}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    defaultValue={workspace.slug}
                    pattern="[a-z0-9-]+"
                    title="Only lowercase letters, numbers, and hyphens"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Workspace URL: /w/{workspace.slug}
                  </p>
                </div>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Workspace Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace Statistics</CardTitle>
            <CardDescription>Overview of your workspace activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">{stats?._count.WorkspaceMembership || 0}</p>
                <p className="text-sm text-gray-600">Total Members</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">{stats?._count.Challenge || 0}</p>
                <p className="text-sm text-gray-600">Active Challenges</p>
              </div>
            </div>
            <div className="mt-6 border-t pt-4">
              <div className="mb-4">
                <h3 className="font-medium mb-1">Points Budget</h3>
                <div className="text-sm text-gray-600 mb-2">Total: {budget?.totalBudget || 0} · Allocated: {budget?.allocated || 0} · Remaining: {Math.max(0, (budget?.totalBudget || 0) - (budget?.allocated || 0))}</div>
                <form action={async (formData: FormData) => {
                  "use server"
                  const total = Number(formData.get('totalBudget') || 0)
                  await upsertWorkspacePointsBudget(workspace.id, isNaN(total) ? 0 : total, dbUser.id)
                }} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="totalBudget">Set Total Budget</Label>
                    <Input id="totalBudget" name="totalBudget" type="number" min={0} step={1} defaultValue={budget?.totalBudget || 0} />
                  </div>
                  <Button type="submit">Save Budget</Button>
                </form>
              </div>
              <form action={setPointsBalance} className="grid gap-3 max-w-md">
                <input type="hidden" name="workspaceId" value={workspace.id} />
                <input type="hidden" name="userId" value={dbUser.id} />
                <Label htmlFor="totalPoints">Activities completed (total)</Label>
                <Input id="totalPoints" name="totalPoints" type="number" min={0} step={1} defaultValue={0} />
                <Label htmlFor="availablePoints">Activities completed (available)</Label>
                <Input id="availablePoints" name="availablePoints" type="number" min={0} step={1} defaultValue={0} />
                <Button type="submit">Update activities completed</Button>
              </form>
              <p className="text-xs text-gray-500 mt-2">Admins and participants each have a per-workspace PointsBalance. This form updates your own allocation in this workspace.</p>
            </div>
          </CardContent>
        </Card>

        {/* Membership */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace Membership</CardTitle>
            <CardDescription>Manage your membership in this workspace</CardDescription>
          </CardHeader>
          <CardContent>
            {isOwner ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">
                    You are the owner of this workspace
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    As the workspace owner, you cannot leave this workspace. To leave, you must first transfer ownership to another admin.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  You are an admin member of this workspace. You can leave this workspace at any time.
                </p>
                <form action={leaveWorkspace}>
                  <input type="hidden" name="userId" value={dbUser.id} />
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <Button type="submit" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    Leave Workspace
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone - Only for owners */}
        {isOwner && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for your workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deleteWorkspace}>
                <input type="hidden" name="workspaceId" value={workspace.id} />
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Once you delete a workspace, there is no going back. This will permanently delete
                    the workspace, all challenges, and remove all participant enrollments.
                  </p>
                  <Button type="submit" variant="destructive">
                    Delete Workspace
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}