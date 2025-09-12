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
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workspaces</h1>
          <p className="text-gray-600">Manage your workspaces and join new ones</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{user.email}</span>
          <LogoutButton />
        </div>
      </div>

      <div className="grid gap-6">
        {/* User's Workspaces */}
        {memberships.length > 0 ? (
          <Card className="border-coral-500/20">
            <CardHeader>
              <CardTitle>Your Workspaces</CardTitle>
              <CardDescription>
                Workspaces you are a member of ({memberships.length} total)
              </CardDescription>
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
              <div className="mt-4 flex gap-2">
                <CreateWorkspaceDialog 
                  userId={dbUser.id} 
                  currentWorkspace={null}
                />
                <JoinWorkspaceDialog userId={dbUser.id} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Workspaces</CardTitle>
              <CardDescription>You are not currently a member of any workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
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
            <CardTitle>Discover Workspaces</CardTitle>
            <CardDescription>Browse and join available workspaces</CardDescription>
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