import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getUserBySupabaseId, getUserEnrollments, getWorkspaceCommunications } from "@/lib/db/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Trophy, Target, CheckCircle, Clock, ArrowRight, Plus, Eye } from "lucide-react"
import { AnnouncementCard } from "./announcement-card"

interface EnrollmentCardProps {
  enrollment: {
    id: string
    status: string
    Challenge: {
      id: string
      title: string
      description: string
    }
  }
  workspaceSlug: string
}

function EnrollmentCard({ enrollment, workspaceSlug }: EnrollmentCardProps) {
  const statusConfig = {
    ENROLLED: { 
      color: "bg-green-50 text-green-700 border-green-200", 
      icon: CheckCircle,
      label: "Active"
    },
    INVITED: { 
      color: "bg-coral-50 text-coral-700 border-coral-200", 
      icon: Clock,
      label: "Invited"
    },
    WITHDRAWN: { 
      color: "bg-gray-50 text-gray-700 border-gray-200", 
      icon: CheckCircle,
      label: "Completed"
    },
  }

  const config = statusConfig[enrollment.status as keyof typeof statusConfig] || statusConfig.ENROLLED
  const StatusIcon = config.icon

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-coral-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 truncate">{enrollment.Challenge.title}</h3>
              <Badge variant="outline" className={config.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {enrollment.Challenge.description}
            </p>
            <Link
              href={`/w/${workspaceSlug}/participant/challenges/${enrollment.Challenge.id}`}
              className="inline-flex items-center text-sm text-coral-600 hover:text-coral-700 font-medium transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Challenge
              <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-gray-200 rounded-lg h-24" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-24" />
        ))}
      </div>
      <div className="bg-gray-200 rounded-lg h-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-200 rounded-lg h-32" />
        <div className="bg-gray-200 rounded-lg h-32" />
      </div>
    </div>
  )
}

export default async function ParticipantDashboard({ 
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
  if (!role || role !== "PARTICIPANT") {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  // Get user from database using standardized query
  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) {
    redirect("/auth/login")
  }

  // Get user's enrollments using workspace-scoped query
  const enrollments = await getUserEnrollments(dbUser.id, workspace.id)

  const communications = await getWorkspaceCommunications(workspace.id, { limit: 25 })
  const enrollmentChallengeIds = new Set(enrollments.map(e => e.Challenge.id))
  const relevantCommunications = communications.filter(comm => {
    if (comm.scope === 'WORKSPACE') return true
    if ((comm.scope === 'CHALLENGE' || comm.scope === 'ACTIVITY') && comm.challengeId) {
      return enrollmentChallengeIds.has(comm.challengeId)
    }
    return false
  })

  // Calculate stats
  const totalEnrollments = enrollments.length
  const activeEnrollments = enrollments.filter(e => e.status === "ENROLLED").length
  const completedEnrollments = enrollments.filter(e => e.status === "WITHDRAWN").length
  const invitedEnrollments = enrollments.filter(e => e.status === "INVITED").length

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-coral-50 to-terracotta-50 rounded-lg p-6 border border-coral-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to {workspace.name}
          </h1>
          <p className="text-gray-600">
            Track your progress and discover new challenges in your workspace.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Announcements & Updates</CardTitle>
            <CardDescription>Stay up to date with workspace and challenge communications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {relevantCommunications.length === 0 ? (
              <div className="text-sm text-gray-600">No announcements yet. New updates will appear here.</div>
            ) : (
              relevantCommunications.slice(0, 5).map((comm) => (
                <AnnouncementCard key={comm.id} communication={comm} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-coral-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Challenges</p>
                  <p className="text-3xl font-bold text-coral-600">{totalEnrollments}</p>
                </div>
                <Trophy className="h-8 w-8 text-coral-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-green-600">{activeEnrollments}</p>
                </div>
                <Target className="h-8 w-8 text-green-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-blue-600">{completedEnrollments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Invitations</p>
                  <p className="text-3xl font-bold text-yellow-600">{invitedEnrollments}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-75" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Challenges Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-coral-500" />
                  Your Challenges
                </CardTitle>
                <CardDescription>
                  {totalEnrollments > 0 
                    ? `You're participating in ${totalEnrollments} challenge${totalEnrollments === 1 ? '' : 's'}` 
                    : "No challenges yet - start by browsing available challenges"}
                </CardDescription>
              </div>
              <Button asChild className="bg-coral-500 hover:bg-coral-600">
                <Link href={`/w/${slug}/participant/challenges`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Challenges
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {enrollments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {enrollments.map((enrollment) => (
                  <EnrollmentCard 
                    key={enrollment.id} 
                    enrollment={enrollment} 
                    workspaceSlug={slug}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Get started by exploring and joining challenges in your workspace. 
                  Connect with your team and work on meaningful projects together.
                </p>
                <Button asChild className="bg-coral-500 hover:bg-coral-600">
                  <Link href={`/w/${slug}/participant/challenges`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Explore Challenges
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-coral-100 rounded-lg flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-coral-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Discover Challenges</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Browse available challenges and join ones that interest you
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/w/${slug}/participant/challenges`}>
                      Browse All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-terracotta-100 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-terracotta-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Switch Workspace</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Access other workspaces you're a member of
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/workspaces">
                      View Workspaces
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  )
}
