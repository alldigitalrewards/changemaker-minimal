import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogoutButton } from "@/components/auth/logout-button"
import Link from "next/link"
import CreateWorkspaceDialog from "./create-workspace-dialog"
import JoinWorkspaceDialog from "./join-workspace-dialog"
import WorkspaceCard from "./workspace-card-client"
import { getUserBySupabaseId } from "@/lib/db/queries"
import { isPlatformSuperAdmin } from "@/lib/auth/rbac"
import { listMemberships } from "@/lib/db/workspace-membership"
import { Plus, Search, Building, Users } from "lucide-react"

export default async function WorkspacesPage() {
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

  // Get user's workspace memberships (new system)
  const memberships = await listMemberships(dbUser.id)

  // Tenancy-aware available workspaces list
  let allWorkspaces: { id: string; name: string; slug: string; _count: { memberships: number; challenges: number } }[] = []
  const userIsPlatformAdmin = isPlatformSuperAdmin(dbUser)
  if (userIsPlatformAdmin) {
    // Super admin sees all tenants' active & published workspaces
    allWorkspaces = await prisma.workspace.findMany({
      where: { active: true, published: true },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { memberships: true, challenges: true } }
      }
    })
  } else {
    // Non-super-admins: show tenant-visible workspaces
    // Determine tenant from first membership (preferred) or legacy workspace
    const userTenantId = dbUser.workspaceId
      ? (await prisma.workspace.findUnique({ where: { id: dbUser.workspaceId }, select: { tenantId: true } }))?.tenantId
      : memberships[0]?.workspace?.tenantId || null
    if (userTenantId) {
      // Show all active, published workspaces in the same tenant
      // Both admins and participants can discover workspaces within their tenant
      allWorkspaces = await prisma.workspace.findMany({
        where: { tenantId: userTenantId, active: true, published: true },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { memberships: true, challenges: true } }
        }
      })
    } else {
      // No tenant context resolvable, suppress discovery
      allWorkspaces = []
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-100 -mx-4 px-4 mb-8">
        <div className="py-6">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-coral-100 rounded-lg">
                  <Building className="h-6 w-6 text-coral-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
              </div>
              <p className="text-gray-600">
                Manage your workspaces and discover new opportunities
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Action buttons */}
              <div className="flex gap-3">
                <CreateWorkspaceDialog
                  userId={dbUser.id}
                  currentWorkspace={null}
                />
                <JoinWorkspaceDialog userId={dbUser.id} scrollToDiscover />
              </div>
              
              {/* User info */}
              <div className="flex items-center gap-3 pl-0 sm:pl-4 sm:border-l border-gray-200">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  <div className="text-xs text-gray-500">Signed in</div>
                </div>
                <LogoutButton variant="outline" className="text-gray-700 border-gray-300 hover:bg-gray-50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8">
        {/* User's Workspaces */}
        {memberships.length > 0 ? (
          <Card className="border-coral-200 bg-gradient-to-br from-coral-50/50 to-white shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-coral-100 rounded-lg">
                  <Building className="h-5 w-5 text-coral-600" />
                </div>
                <div>
                  <CardTitle className="text-coral-900 text-xl">Your Workspaces</CardTitle>
                  <CardDescription className="text-coral-700">
                    Workspaces you are a member of ({memberships.length} total)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {memberships.map((membership) => {
                  const workspace = {
                    ...membership.workspace,
                    _count: {
                      users: membership.workspace._count?.memberships || 0,
                      challenges: membership.workspace._count?.challenges || 0
                    }
                  }
                  
                  return (
                    <WorkspaceCard
                      key={workspace.id}
                      workspace={workspace}
                      isUserWorkspace={true}
                      userId={dbUser.id}
                      userRole={membership.role}
                      isPrimary={membership.isPrimary}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <CardTitle className="mb-2">No Workspaces Yet</CardTitle>
              <CardDescription className="mb-6">
                Get started by creating your own workspace or joining an existing one.
              </CardDescription>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <CreateWorkspaceDialog
                  userId={dbUser.id}
                  currentWorkspace={null}
                />
                <JoinWorkspaceDialog userId={dbUser.id} scrollToDiscover />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Workspaces - Show if there are any workspaces to discover */}
        {allWorkspaces.length > 0 && (
        <Card
          id="discover-workspaces"
          className="border-gray-200 shadow-sm transition-all"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Search className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Discover Workspaces</CardTitle>
                <CardDescription>Browse and join available workspaces</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allWorkspaces.map((workspace) => {
                // Check if user is already a member
                const membership = memberships.find(m => m.workspaceId === workspace.id)
                const isUserWorkspace = !!membership
                
                return (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={{
                      ...workspace,
                      _count: {
                        users: workspace._count.memberships,
                        challenges: workspace._count.challenges
                      }
                    }}
                    isUserWorkspace={isUserWorkspace}
                    userId={dbUser.id}
                    userRole={membership?.role}
                    isPrimary={membership?.isPrimary}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}