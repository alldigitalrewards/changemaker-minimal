import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getUserBySupabaseId, getWorkspaceLeaderboard } from "@/lib/db/queries"
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
    user: { id: string; email: string }
    totalPoints: number
  }
  rank: number
  isCurrentUser: boolean
}

function LeaderboardTile({ entry, rank, isCurrentUser }: LeaderboardEntryProps) {
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

  const displayName = entry.user.email.split('@')[0]

  return (
    <Card className={`transition-all duration-200 ${isCurrentUser ? 'ring-2 ring-coral-300' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRankIcon(rank)}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 truncate max-w-[140px]">{displayName}</p>
                {isCurrentUser && (
                  <Badge className="bg-coral-500 text-white text-xs">You</Badge>
                )}
              </div>
              <p className="text-xs text-gray-600">
                {entry.totalPoints} activities completed
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-coral-600">{entry.totalPoints}</div>
            <div className="text-[10px] text-gray-500">completed</div>
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

  const userIndex = leaderboard.findIndex(entry => entry.user.id === dbUser.id)
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
            <Card className="bg-gradient-to-r from-coral-50 to-pink-50 border-coral-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-5 w-5 text-coral-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Your ranking</p>
                      <p className="text-xs text-gray-600">#{userRank}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-coral-600">{leaderboard[userIndex]?.totalPoints ?? 0}</div>
                    <div className="text-[10px] text-gray-500">completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {leaderboard.map((entry, index) => (
            <LeaderboardTile
              key={entry.user.id}
              entry={entry as any}
              rank={index + 1}
              isCurrentUser={entry.user.id === dbUser.id}
            />
          ))}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Top completed</p>
                  <p className="text-2xl font-bold text-amber-600">{leaderboard[0]?.totalPoints || 0}</p>
                </div>
                <Crown className="h-6 w-6 text-amber-500 opacity-75" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Average completed</p>
                  <p className="text-2xl font-bold text-blue-600">{
                    leaderboard.length ? Math.round(leaderboard.reduce((s, e) => s + e.totalPoints, 0) / leaderboard.length) : 0
                  }</p>
                </div>
                <Users className="h-6 w-6 text-blue-500 opacity-75" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Participants</p>
                  <p className="text-2xl font-bold text-green-600">{leaderboard.length}</p>
                </div>
                <Users className="h-6 w-6 text-green-500 opacity-75" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  )
}