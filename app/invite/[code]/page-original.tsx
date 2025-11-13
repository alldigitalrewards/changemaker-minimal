import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getInviteByCode } from "@/lib/db/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AcceptInviteForm } from "./accept-invite-form"
import { Clock, Users, Shield, UserCheck } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function InvitePage({
  params
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const h = await headers()

  // Get invite details
  const invite = await getInviteByCode(code)

  console.log('[INVITE PAGE] Loading invite page:', {
    code,
    hasUser: !!user,
    userEmail: user?.email,
    inviteFound: !!invite,
    inviteTargetEmail: invite ? (invite as any).targetEmail : null,
    inviteWorkspace: invite?.workspace.name
  });

  if (!invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invite Not Found</CardTitle>
            <CardDescription>
              This invite code does not exist or has been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Check if invite is expired
  const isExpired = invite.expiresAt <= new Date()
  const isFullyUsed = invite.usedCount >= invite.maxUses

  if (isExpired || isFullyUsed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invite Unavailable</CardTitle>
            <CardDescription>
              {isExpired 
                ? "This invite code has expired." 
                : "This invite code has reached its maximum number of uses."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">
              Please request a new invite from the workspace administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Unauthenticated users can view the invite and will be routed to signup from the accept button

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            Join the <strong>{invite.workspace.name}</strong> workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Details */}
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                <span className="font-medium">Workspace</span>
              </div>
              <span className="text-gray-700">{invite.workspace.name}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {invite.role === 'ADMIN' ? (
                  <Shield className="h-5 w-5 text-blue-500" />
                ) : (
                  <UserCheck className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium">Role</span>
              </div>
              <Badge 
                variant="outline"
                className={invite.role === 'ADMIN' 
                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                  : "bg-green-50 text-green-700 border-green-200"
                }
              >
                {invite.role}
              </Badge>
            </div>

            {invite.challenge && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">C</span>
                  </div>
                  <span className="font-medium">Challenge</span>
                </div>
                <span className="text-blue-700 font-medium">{invite.challenge.title}</span>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <span className="font-medium">Expires</span>
              </div>
              <span className="text-gray-700">
                {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                <span className="font-medium">Uses</span>
              </div>
              <span className="text-gray-700">
                {invite.usedCount} / {invite.maxUses}
              </span>
            </div>
          </div>

          {/* Accept Form */}
          <AcceptInviteForm code={code} role={invite.role as any} />

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            <p>Invited by {invite.creator.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}