import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getWorkspaceInviteCodes } from "@/lib/db/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreateInviteDialog } from "./create-invite-dialog"
import { Copy, Clock, Users, Link as LinkIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

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
            {inviteCodes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created by</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inviteCodes.map((invite) => {
                    const isExpired = invite.expiresAt <= new Date()
                    const isFullyUsed = invite.usedCount >= invite.maxUses
                    const isActive = !isExpired && !isFullyUsed

                    return (
                      <TableRow key={invite.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {invite.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(
                                `${window.location.origin}/invite/${invite.code}`
                              )}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {invite.challengeId ? (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                Challenge
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-50 text-green-700">
                                Workspace
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {invite.role}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={isActive ? "default" : "secondary"}
                            className={
                              isActive 
                                ? "bg-green-100 text-green-800 border-green-200" 
                                : isExpired
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                            }
                          >
                            {isActive ? (
                              <>
                                <LinkIcon className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : isExpired ? (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Expired
                              </>
                            ) : (
                              <>
                                <Users className="h-3 w-3 mr-1" />
                                Full
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {invite.usedCount}/{invite.maxUses}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {invite.creator.email}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(
                                `${window.location.origin}/invite/${invite.code}`
                              )}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-gray-500">
                No invite codes created yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}