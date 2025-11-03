import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getUserBySupabaseId, getWorkspaceLeaderboard } from "@/lib/db/queries"
import { getUserDisplayName } from "@/lib/user-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Users,
  Target,
  CheckSquare
} from "lucide-react"

function LeaderboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-gray-200 rounded-lg h-24" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-20" />
        ))}
      </div>
    </div>
  )
}

interface LeaderboardEntryProps {
  entry: {
    User: { id: string; email: string; firstName: string | null; lastName: string | null; displayName: string | null }
    totalPoints: number
  }
  rank: number
  isCurrentUser: boolean
}

function LeaderboardTile({ entry, rank, isCurrentUser }: LeaderboardEntryProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-amber-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-700" />
      default:
        return <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">#{rank}</div>
    }
  }

  const displayName = getUserDisplayName(entry.User)

  // Special styling for top 3
  const isTopThree = rank <= 3
  const borderColor = isCurrentUser ? 'border-l-4 border-l-coral-500' : isTopThree ? 'border-l-4 border-l-amber-400' : ''

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${borderColor} ${isCurrentUser && !isTopThree ? 'ring-2 ring-coral-200 bg-coral-50/30' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getRankIcon(rank)}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-gray-900 truncate max-w-[180px]">{displayName}</p>
                {isCurrentUser && (
                  <Badge className="bg-coral-500 hover:bg-coral-600 text-white text-xs px-2 py-0.5">You</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {entry.totalPoints} activities completed
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${isTopThree ? 'text-amber-600' : 'text-gray-700'}`}>
              {entry.totalPoints}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function ParticipantLeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== "PARTICIPANT") redirect("/workspaces")

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) redirect("/workspaces")

  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) redirect("/auth/login")

  const leaderboard = await getWorkspaceLeaderboard(workspace.id, 50)

  const userIndex = leaderboard.findIndex(entry => entry.User.id === dbUser.id)
  const userRank = userIndex >= 0 ? userIndex + 1 : 0

  return (
    <Suspense fallback={<LeaderboardSkeleton />}>      
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Workspace Leaderboard</h1>
          <p className="text-gray-600">Activities completed in {workspace.name}</p>
        </div>

        {/* Compact grid with "Your ranking" tile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {userRank > 0 && (
            <Card className="bg-gradient-to-br from-white to-coral-50 border-2 border-coral-300 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-coral-100 flex items-center justify-center">
                      <CheckSquare className="h-4 w-4 text-coral-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Your ranking</p>
                      <p className="text-lg font-bold text-gray-900">#{userRank}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-coral-600">{leaderboard[userIndex]?.totalPoints ?? 0}</div>
                    <div className="text-xs text-gray-500 mt-0.5">completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {leaderboard.map((entry, index) => (
            <LeaderboardTile
              key={entry.User.id}
              entry={entry as any}
              rank={index + 1}
              isCurrentUser={entry.User.id === dbUser.id}
            />
          ))}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Top completed</p>
                  <p className="text-3xl font-bold text-amber-600">{leaderboard[0]?.totalPoints || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Crown className="h-7 w-7 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Average completed</p>
                  <p className="text-3xl font-bold text-blue-600">{
                    leaderboard.length ? Math.round(leaderboard.reduce((s, e) => s + e.totalPoints, 0) / leaderboard.length) : 0
                  }</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Target className="h-7 w-7 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Participants</p>
                  <p className="text-3xl font-bold text-green-600">{leaderboard.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-7 w-7 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  )
}