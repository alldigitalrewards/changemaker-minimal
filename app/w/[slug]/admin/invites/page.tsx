import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getWorkspaceInviteCodes } from "@/lib/db/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateInviteDialog } from "./create-invite-dialog"
import { InvitesTable } from "./invites-table"

export default async function AdminInvitesPage({ 
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

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== "ADMIN") {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  const inviteCodes = await getWorkspaceInviteCodes(workspace.id)

  // Stats
  const activeInvites = inviteCodes.filter(invite => 
    invite.expiresAt > new Date() && invite.usedCount < invite.maxUses
  ).length
  const expiredInvites = inviteCodes.filter(invite => invite.expiresAt <= new Date()).length
  const fullyUsedInvites = inviteCodes.filter(invite => invite.usedCount >= invite.maxUses).length

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workspace Invites</h1>
        <p className="text-gray-600">Manage invite codes for {workspace.name}</p>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Invites</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{inviteCodes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{activeInvites}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{expiredInvites}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Fully Used</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{fullyUsedInvites}</p>
            </CardContent>
          </Card>
        </div>

        {/* Invites Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invite Codes</CardTitle>
                <CardDescription>Create and manage workspace invite codes</CardDescription>
              </div>
              <CreateInviteDialog slug={slug} />
            </div>
          </CardHeader>
          <CardContent>
            <InvitesTable inviteCodes={inviteCodes} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}