import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateWorkspace, deleteWorkspace, leaveWorkspace, transferOwnership } from "./actions"
import { getUserBySupabaseId } from "@/lib/db/queries"
import { isWorkspaceOwner, listWorkspaceMemberships } from "@/lib/db/workspace-membership"
import { ThemeSelector } from "@/components/admin/theme-selector"
import { WorkspaceMemberships } from "@/components/admin/workspace-memberships"
import { WorkspaceOwnershipTransferDialog } from "@/components/admin/workspace-ownership-transfer-dialog"

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

  // Get all workspace memberships for admins/managers display
  // Exclude platform super admins - they have platform-wide access and aren't workspace-specific
  const allMemberships = await listWorkspaceMemberships(workspace.id)
  const memberships = allMemberships.filter(m => {
    const user = (m as any).User;
    return !user.platformSuperAdmin; // Filter out platform super admins
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workspace Settings</h1>
        <p className="text-gray-600">Manage settings for {workspace.name}</p>
      </div>

      <div className="grid gap-6">
        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Choose a color palette for your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Workspace Memberships - Admins & Managers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workspace Leadership</CardTitle>
                <CardDescription>
                  Admins and managers who can manage this workspace
                </CardDescription>
              </div>
              {isOwner && (
                <WorkspaceOwnershipTransferDialog
                  workspaceId={workspace.id}
                  workspaceName={workspace.name}
                  currentOwnerId={dbUser.id}
                  admins={memberships
                    .filter(m => m.role === 'ADMIN')
                    .map(m => ({
                      id: m.id,
                      userId: m.userId,
                      user: {
                        id: (m as any).User.id,
                        email: (m as any).User.email,
                        displayName: (m as any).User.displayName,
                        firstName: (m as any).User.firstName,
                        lastName: (m as any).User.lastName,
                      },
                    }))}
                  onTransfer={async (fromUserId: string, toUserId: string) => {
                    "use server"
                    const formData = new FormData()
                    formData.append("workspaceId", workspace.id)
                    formData.append("fromUserId", fromUserId)
                    formData.append("toUserId", toUserId)
                    await transferOwnership(formData)
                  }}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <WorkspaceMemberships
              memberships={memberships.map(m => ({
                id: m.id,
                userId: m.userId,
                role: m.role as "ADMIN" | "MANAGER" | "PARTICIPANT",
                isOwner: (m as any).isOwner || false,
                joinedAt: m.joinedAt,
                user: {
                  id: (m as any).User.id,
                  email: (m as any).User.email,
                  firstName: (m as any).User.firstName,
                  lastName: (m as any).User.lastName,
                  displayName: (m as any).User.displayName,
                },
              }))}
              currentUserId={dbUser.id}
            />
          </CardContent>
        </Card>

        {/* General Settings - Owner Only */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Update your workspace information (workspace owner only)
              </CardDescription>
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
        )}

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