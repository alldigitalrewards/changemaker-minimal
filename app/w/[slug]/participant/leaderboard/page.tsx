import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getUserBySupabaseId, getWorkspaceLeaderboard, getOrCreatePointsBalance } from "@/lib/db/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { 
  Trophy, 
  Medal, 
  Award, 
  Star, 
  Crown, 
  TrendingUp, 
  Users,
  Target,
  ArrowRight,
  Activity
} from "lucide-react"

function LeaderboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-gray-200 rounded-lg h-24" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32" />
        ))}
      </div>
      <div className="bg-gray-200 rounded-lg h-64" />
    </div>
  )
}

interface LeaderboardEntryProps {
  entry: {
    user: {
      id: string
      email: string
    }
    totalPoints: number
    availablePoints: number
  }
  rank: number
  isCurrentUser: boolean
}

function LeaderboardEntry({ entry, rank, isCurrentUser }: LeaderboardEntryProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-amber-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{rank}</div>
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
      case 2:
        return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
      case 3:
        return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
      default:
        return isCurrentUser 
          ? "bg-gradient-to-r from-coral-50 to-pink-50 border-coral-200" 
          : "bg-white border-gray-200"
    }
  }

  // Anonymize email for privacy
  const displayName = entry.user.email.split('@')[0]
  
  return (
    <Card className={`transition-all duration-200 ${getRankColor(rank)} ${isCurrentUser ? 'ring-2 ring-coral-300' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRankIcon(rank)}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{displayName}</p>
                {isCurrentUser && (
                  <Badge className="bg-coral-500 text-white text-xs">You</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {entry.totalPoints} points earned
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-coral-600">{entry.totalPoints}</div>
            <div className="text-xs text-gray-500">points</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface TopPerformerCardProps {
  entry: {
    user: {
      id: string
      email: string
    }
    totalPoints: number
  }
  rank: number
  isCurrentUser: boolean
}

function TopPerformerCard({ entry, rank, isCurrentUser }: TopPerformerCardProps) {
  const displayName = entry.user.email.split('@')[0]
  
  const cardStyles = {
    1: "bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-300",
    2: "bg-gradient-to-br from-gray-100 to-slate-100 border-gray-300", 
    3: "bg-gradient-to-br from-orange-100 to-amber-100 border-orange-300"
  }

  const icons = {
    1: <Crown className="h-8 w-8 text-amber-600" />,
    2: <Medal className="h-8 w-8 text-gray-500" />,
    3: <Award className="h-8 w-8 text-amber-600" />
  }

  const positions = {
    1: "🥇 1st Place",
    2: "🥈 2nd Place", 
    3: "🥉 3rd Place"
  }

  return (
    <Card className={`${cardStyles[rank as keyof typeof cardStyles]} transition-all duration-200 hover:shadow-lg`}>
      <CardContent className="p-6 text-center">
        <div className="mb-4">
          {icons[rank as keyof typeof icons]}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">
            {positions[rank as keyof typeof positions]}
          </p>
          <div className="flex items-center justify-center gap-2">
            <p className="font-bold text-lg text-gray-900">{displayName}</p>
            {isCurrentUser && (
              <Badge className="bg-coral-500 text-white text-xs">You</Badge>
            )}
          </div>
          <div className="flex items-center justify-center gap-1">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-2xl font-bold text-gray-800">{entry.totalPoints}</span>
            <span className="text-sm text-gray-600">pts</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function ParticipantLeaderboardPage({ 
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

  // Get workspace leaderboard and user's points balance
  const [leaderboard, userPointsBalance] = await Promise.all([
    getWorkspaceLeaderboard(workspace.id, 20), // Top 20 participants
    getOrCreatePointsBalance(dbUser.id, workspace.id)
  ])

  // Find current user's rank
  const userRank = leaderboard.findIndex(entry => entry.user.id === dbUser.id) + 1
  const topThree = leaderboard.slice(0, 3)
  const remainingEntries = leaderboard.slice(3)

  // Calculate stats
  const totalParticipants = leaderboard.length
  const averagePoints = totalParticipants > 0 
    ? Math.round(leaderboard.reduce((sum, entry) => sum + entry.totalPoints, 0) / totalParticipants)
    : 0
  const topPoints = leaderboard[0]?.totalPoints || 0

  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Workspace Leaderboard</h1>
          <p className="text-gray-600">
            See how you rank among participants in {workspace.name}
          </p>
        </div>

        {/* Your Rank Card */}
        {userRank > 0 && (
          <Card className="bg-gradient-to-r from-coral-50 to-pink-50 border-coral-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-coral-500 rounded-full flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">Your Current Ranking</p>
                    <p className="text-sm text-gray-600">
                      {userPointsBalance.totalPoints} points earned across all challenges
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-coral-600">#{userRank}</div>
                  <div className="text-sm text-gray-500">of {totalParticipants}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Score</p>
                  <p className="text-3xl font-bold text-amber-600">{topPoints}</p>
                </div>
                <Crown className="h-8 w-8 text-amber-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-3xl font-bold text-blue-600">{averagePoints}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500 opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Participants</p>
                  <p className="text-3xl font-bold text-green-600">{totalParticipants}</p>
                </div>
                <Users className="h-8 w-8 text-green-500 opacity-75" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top 3 Winners */}
        {topThree.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top Performers
              </CardTitle>
              <CardDescription>
                The highest-scoring participants in your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topThree.map((entry, index) => (
                  <TopPerformerCard
                    key={entry.user.id}
                    entry={entry}
                    rank={index + 1}
                    isCurrentUser={entry.user.id === dbUser.id}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-coral-500" />
              Full Rankings
            </CardTitle>
            <CardDescription>
              Complete leaderboard for all active participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {/* Show top 3 again in compact format if we have remaining entries */}
                {topThree.map((entry, index) => (
                  <LeaderboardEntry
                    key={`top-${entry.user.id}`}
                    entry={entry}
                    rank={index + 1}
                    isCurrentUser={entry.user.id === dbUser.id}
                  />
                ))}
                
                {/* Show remaining entries */}
                {remainingEntries.map((entry, index) => (
                  <LeaderboardEntry
                    key={entry.user.id}
                    entry={entry}
                    rank={index + 4} // Start from rank 4
                    isCurrentUser={entry.user.id === dbUser.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rankings yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Start participating in challenges and earning points to appear on the leaderboard.
                </p>
                <Button asChild className="bg-coral-500 hover:bg-coral-600">
                  <Link href={`/w/${slug}/participant/challenges`}>
                    <Activity className="h-4 w-4 mr-2" />
                    Start Participating
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
                  <Activity className="h-6 w-6 text-coral-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">My Activities</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    View all your activity submissions and track your progress
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/w/${slug}/participant/activities`}>
                      View Activities
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
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Browse Challenges</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Join new challenges to earn more points and climb the rankings
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/w/${slug}/participant/challenges`}>
                      View Challenges
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