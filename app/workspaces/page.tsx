import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import JoinWorkspaceDialog from "./join-workspace-dialog"
import WorkspaceCard from "./workspace-card-client"
import { RedeemInviteDialog } from "./redeem-invite-dialog"
import { getUserBySupabaseId, getOptimizedWorkspaceDashboardData } from "@/lib/db/queries"
import { isPlatformSuperAdmin } from "@/lib/auth/rbac"
import { getPrimaryMembership } from "@/lib/db/workspace-membership"
import { Plus, Search, Building, Users, Trophy, TrendingUp, BarChart } from "lucide-react"
import DashboardHeader from "@/components/layout/dashboard-header"
import WorkspacesSidebar from "@/components/workspaces/workspaces-sidebar"
import { WorkspacesSummaryStatsSkeleton, WorkspacesSectionSkeleton } from "./loading-states"

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

  // Get user's workspace data with optimized single query
  const dashboardData = await getOptimizedWorkspaceDashboardData(dbUser.id)
  const memberships = dashboardData.memberships

  const userIsPlatformAdmin = isPlatformSuperAdmin(dbUser?.permissions, user.email!)
  const userIsWorkspaceAdmin = memberships.some(m => m.role === 'ADMIN')

  // Discoverable workspaces based on role
  let discoverableWorkspaces: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    _count: { WorkspaceMembership: number; Challenge: number }
  }[] = []

  if (userIsPlatformAdmin) {
    // Platform super admin (PM) sees ALL workspaces across all tenants
    discoverableWorkspaces = await prisma.workspace.findMany({
      where: { active: true, published: true },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { WorkspaceMembership: true, Challenge: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  } else if (userIsWorkspaceAdmin) {
    // Regular admins only see workspaces within their tenant boundaries
    // Get tenant IDs from user's admin workspaces
    const adminWorkspaceIds = memberships
      .filter(m => m.role === 'ADMIN')
      .map(m => m.workspaceId)

    if (adminWorkspaceIds.length > 0) {
      // For now, show public workspaces that the admin owns or manages
      discoverableWorkspaces = await prisma.workspace.findMany({
        where: {
          id: { in: adminWorkspaceIds },
          active: true,
          published: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: { select: { WorkspaceMembership: true, Challenge: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    }
  }

  // Use pre-calculated summary stats from optimized query
  const { totalWorkspaces, totalMembers, totalChallenges } = dashboardData.summary

  // Get primary membership for header
  const primaryMembership = await getPrimaryMembership(dbUser.id)

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <DashboardHeader
        title="Workspaces"
        workspace={primaryMembership?.workspace || { name: 'All Workspaces', slug: 'home' }}
        user={user}
        role={primaryMembership?.role || 'PARTICIPANT'}
        showRoleSwitcher={false}
        showWorkspaceSwitcher={false}
        isGlobalPage={true}
        customBadge={userIsPlatformAdmin ? {
          label: 'Platform Admin',
          value: '🔱 Superadmin',
          variant: 'purple' as const
        } : undefined}
      />

      {/* Main content with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <WorkspacesSidebar
          memberships={memberships.map(m => ({
            workspaceId: m.workspaceId,
            role: m.role,
            workspace: m.Workspace
          }))}
          currentView="my-workspaces"
          userRole={primaryMembership?.role || 'PARTICIPANT'}
          isAdmin={userIsWorkspaceAdmin}
          isSuperAdmin={userIsPlatformAdmin}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="container mx-auto py-8 px-6">

      {/* Summary Stats */}
      <Suspense fallback={<WorkspacesSummaryStatsSkeleton />}>
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
      </Suspense>

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
                    ...membership.Workspace,
                    _count: {
                      users: membership.Workspace._count?.WorkspaceMembership || 0,
                      challenges: membership.Workspace._count?.Challenge || 0
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
                Redeem an invitation code to join a workspace.
              </CardDescription>
              <div className="flex justify-center">
                <RedeemInviteDialog />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Workspaces - Show for platform admins and workspace admins */}
        {(userIsPlatformAdmin || userIsWorkspaceAdmin) && discoverableWorkspaces.length > 0 && (
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
              {discoverableWorkspaces.map((workspace) => {
                // Check if user is already a member
                const membership = memberships.find(m => m.workspaceId === workspace.id)
                const isUserWorkspace = !!membership
                
                return (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={{
                      ...workspace,
                      _count: {
                        users: workspace._count.WorkspaceMembership,
                        challenges: workspace._count.Challenge
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
        </main>
      </div>
    </div>
  )
}
