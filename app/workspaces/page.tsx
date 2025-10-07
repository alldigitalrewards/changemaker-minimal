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
import { Plus, Search, Building, Users, Trophy, TrendingUp, BarChart } from "lucide-react"

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

  // Tenancy-aware available workspaces list with enhanced stats
  let allWorkspaces: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    _count: { memberships: number; challenges: number }
  }[] = []
  const userIsPlatformAdmin = isPlatformSuperAdmin(dbUser)
  if (userIsPlatformAdmin) {
    // Super admin sees all tenants' active & published workspaces
    allWorkspaces = await prisma.workspace.findMany({
      where: { active: true, published: true },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { memberships: true, challenges: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  } else {
    // Non-super-admins: show tenant-visible workspaces
    // Determine tenant from first membership (preferred) or legacy workspace
    let userTenantId: string | null = null
    if (dbUser.workspaceId) {
      const legacyWorkspace = await prisma.workspace.findUnique({
        where: { id: dbUser.workspaceId },
        select: { tenantId: true }
      })
      userTenantId = legacyWorkspace?.tenantId || null
    } else if (memberships[0]?.workspaceId) {
      const firstWorkspace = await prisma.workspace.findUnique({
        where: { id: memberships[0].workspaceId },
        select: { tenantId: true }
      })
      userTenantId = firstWorkspace?.tenantId || null
    }
    if (userTenantId) {
      // Show all active, published workspaces in the same tenant
      // Both admins and participants can discover workspaces within their tenant
      allWorkspaces = await prisma.workspace.findMany({
        where: { tenantId: userTenantId, active: true, published: true },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: { select: { memberships: true, challenges: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // No tenant context resolvable, suppress discovery
      allWorkspaces = []
    }
  }

  // Calculate summary stats
  const totalWorkspaces = memberships.length
  const totalMembers = memberships.reduce((sum, m) => sum + (m.workspace._count?.memberships || 0), 0)
  const totalChallenges = memberships.reduce((sum, m) => sum + (m.workspace._count?.challenges || 0), 0)

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

      {/* Summary Stats */}
      {memberships.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-coral-50 to-white border-coral-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Your Workspaces</p>
                  <p className="text-3xl font-bold text-coral-600">{totalWorkspaces}</p>
                  <p className="text-xs text-gray-500 mt-1">Active memberships</p>
                </div>
                <Building className="h-10 w-10 text-coral-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-3xl font-bold text-blue-600">{totalMembers}</p>
                  <p className="text-xs text-gray-500 mt-1">Across all workspaces</p>
                </div>
                <Users className="h-10 w-10 text-blue-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Challenges</p>
                  <p className="text-3xl font-bold text-amber-600">{totalChallenges}</p>
                  <p className="text-xs text-gray-500 mt-1">Available to join</p>
                </div>
                <Trophy className="h-10 w-10 text-amber-500 opacity-75" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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