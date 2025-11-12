import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getInviteByCode } from "@/lib/db/queries"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AcceptInviteForm } from "./accept-invite-form"
import { Clock, Users, Shield, UserCheck, Award, TrendingUp, CheckCircle2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function InvitePageEnhanced({
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

  // Get additional context
  const workspaceStats = await prisma.workspaceMembership.count({
    where: { workspaceId: invite.workspace.id }
  })

  const activeChallenges = invite.workspace.id ? await prisma.challenge.count({
    where: {
      workspaceId: invite.workspace.id,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() }
    }
  }) : 0

  console.log('[INVITE PAGE] Loading invite page:', {
    code,
    hasUser: !!user,
    userEmail: user?.email,
    inviteFound: !!invite,
    inviteTargetEmail: (invite as any).targetEmail,
    inviteWorkspace: invite.workspace.name
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Workspace Invitation</h1>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Valid
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Invite Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-coral-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-coral-600" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl">You're Invited!</CardTitle>
                <CardDescription className="text-base mt-2">
                  <span className="font-semibold text-gray-900">{invite.creator.email}</span>
                  {' '}has invited you to join{' '}
                  <span className="font-semibold text-coral-600">{invite.workspace.name}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* What You're Joining */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-coral-500" />
                    What You're Joining
                  </h3>
                  <div className="grid gap-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">Active Community</p>
                        <p className="text-sm text-gray-600">
                          Join {workspaceStats} {workspaceStats === 1 ? 'member' : 'members'} in this workspace
                        </p>
                      </div>
                    </div>

                    {activeChallenges > 0 && (
                      <div className="flex items-start gap-3 p-3 bg-coral-50 rounded-lg">
                        <Award className="h-5 w-5 text-coral-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">Live Challenges</p>
                          <p className="text-sm text-gray-600">
                            {activeChallenges} {activeChallenges === 1 ? 'challenge is' : 'challenges are'} currently active
                          </p>
                        </div>
                      </div>
                    )}

                    {invite.challenge && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">Challenge Enrollment</p>
                          <p className="text-sm text-gray-600">
                            You'll be automatically enrolled in "{invite.challenge.title}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invite Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Invitation Details</h3>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Shield className="h-4 w-4" />
                        <span>Role</span>
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

                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <UserCheck className="h-4 w-4" />
                        <span>Invited by</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {invite.creator.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Expires</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accept Form */}
                <div className="pt-4">
                  <AcceptInviteForm code={code} role={invite.role as any} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Benefits & Security */}
          <div className="space-y-6">
            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's Next</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Create your account in seconds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Access your personalized dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Participate in challenges and earn rewards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Track your progress and achievements</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Secure & Private
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Your data is encrypted and protected. We never share your information without your permission.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
