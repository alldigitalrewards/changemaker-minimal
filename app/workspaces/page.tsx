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

export default async function WorkspacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user's workspaces
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    include: { workspace: true }
  })

  // Get all workspaces for join functionality
  const allWorkspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          users: true,
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
        {/* User's Current Workspace */}
        {dbUser?.workspace ? (
          <Card className="border-coral-500/20">
            <CardHeader>
              <CardTitle>Your Workspace</CardTitle>
              <CardDescription>You are currently part of this workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{dbUser.workspace.name}</h3>
                  <p className="text-sm text-gray-500">/{dbUser.workspace.slug}</p>
                </div>
                <Link href={`/w/${dbUser.workspace.slug}/${dbUser.role.toLowerCase()}/dashboard`}>
                  <Button variant="default">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Workspace</CardTitle>
              <CardDescription>You are not currently part of any workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {dbUser?.role === "ADMIN" && (
                  <CreateWorkspaceDialog userId={dbUser.id} />
                )}
                <JoinWorkspaceDialog userId={dbUser?.id} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Workspaces */}
        <Card>
          <CardHeader>
            <CardTitle>All Workspaces</CardTitle>
            <CardDescription>Browse available workspaces</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allWorkspaces.map((workspace) => {
                const isUserWorkspace = dbUser?.workspaceId === workspace.id
                
                return (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    isUserWorkspace={isUserWorkspace}
                    userId={dbUser?.id}
                    userRole={dbUser?.role}
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