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

  // Get all workspaces for join functionality
  const allWorkspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          memberships: true,
          challenges: true
        }
      }
    }
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        {/* Enhanced Header with actions */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Building className="h-8 w-8 text-coral-500" />
              <h1 className="text-3xl font-bold">Workspaces</h1>
            </div>
            <p className="text-gray-600 text-lg">
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
              <JoinWorkspaceDialog userId={dbUser.id} />
            </div>
            
            {/* User info */}
            <div className="flex items-center gap-3 pl-3 sm:border-l border-gray-200">
              <span className="text-sm text-gray-500">{user.email}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8">
        {/* User's Workspaces */}
        {memberships.length > 0 ? (
          <Card className="border-coral-500/20 bg-coral-50/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building className="h-6 w-6 text-coral-600" />
                <div>
                  <CardTitle className="text-coral-900">Your Workspaces</CardTitle>
                  <CardDescription>
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
                <JoinWorkspaceDialog userId={dbUser.id} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Workspaces */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Search className="h-6 w-6 text-gray-600" />
              <div>
                <CardTitle>Discover Workspaces</CardTitle>
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
      </div>
    </div>
  )
}