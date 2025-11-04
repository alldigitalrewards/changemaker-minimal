"use client"

import { useState } from "react"
import { TimePeriodTabs } from "./time-period-tabs"
import { ChallengeFilter } from "./challenge-filter"
import { YourStatsCard } from "./your-stats-card"
import { TopPerformers } from "./top-performers"
import { RankingRow } from "./ranking-row"
import { WorkspaceStats } from "./workspace-stats"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

type TimePeriod = 'all' | 'month' | 'week' | 'day'

interface LeaderboardEntry {
  User: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    displayName: string | null
  }
  totalPoints: number
}

interface Challenge {
  id: string
  title: string
}

interface LeaderboardClientProps {
  initialLeaderboard: LeaderboardEntry[]
  currentUserId: string
  workspaceName: string
  challenges: Challenge[]
  isAdmin?: boolean
}

function getNextBadgeMilestone(count: number) {
  const milestones = [10, 25, 50, 100]
  const next = milestones.find(m => m > count)
  if (!next) return undefined

  return {
    count: next,
    progress: Math.round((count / next) * 100)
  }
}

function getUserDisplayName(user: LeaderboardEntry['User']): string {
  if (user.displayName) return user.displayName
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return user.email.split('@')[0]
}

export function LeaderboardClient({
  initialLeaderboard,
  currentUserId,
  workspaceName,
  challenges,
  isAdmin = false
}: LeaderboardClientProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [selectedChallenge, setSelectedChallenge] = useState('all')
  const [leaderboard] = useState(initialLeaderboard) // TODO: Fetch filtered data

  const userIndex = leaderboard.findIndex(entry => entry.User.id === currentUserId)
  const userRank = userIndex >= 0 ? userIndex + 1 : 0
  const userActivityCount = userIndex >= 0 ? leaderboard[userIndex].totalPoints : 0

  const topCount = leaderboard[0]?.totalPoints || 0
  const averageCount = leaderboard.length
    ? Math.round(leaderboard.reduce((s, e) => s + e.totalPoints, 0) / leaderboard.length)
    : 0

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export CSV')
  }

  // Prepare top 3 performers
  const top3: [
    LeaderboardEntry | undefined,
    LeaderboardEntry | undefined,
    LeaderboardEntry | undefined
  ] = [
    leaderboard[0],
    leaderboard[1],
    leaderboard[2]
  ]

  const topPerformers: [
    {
      userId: string
      name: string
      email: string
      activityCount: number
      rankChange?: number
      avatarUrl: string | null
    } | undefined,
    {
      userId: string
      name: string
      email: string
      activityCount: number
      rankChange?: number
      avatarUrl: string | null
    } | undefined,
    {
      userId: string
      name: string
      email: string
      activityCount: number
      rankChange?: number
      avatarUrl: string | null
    } | undefined
  ] = top3.map((entry) => {
    if (!entry) return undefined
    return {
      userId: entry.User.id,
      name: getUserDisplayName(entry.User),
      email: entry.User.email,
      activityCount: entry.totalPoints,
      rankChange: undefined, // TODO: Calculate from historical data
      avatarUrl: null
    }
  }) as any

  // Remaining ranks (4+)
  const remainingRanks = leaderboard.slice(3)

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Workspace Leaderboard</h1>
            <p className="text-slate-600">Activities completed in {workspaceName}</p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <TimePeriodTabs value={timePeriod} onChange={setTimePeriod} />
          </div>
          <div className="md:w-auto">
            <ChallengeFilter
              challenges={challenges}
              value={selectedChallenge}
              onChange={setSelectedChallenge}
            />
          </div>
        </div>
      </div>

      {/* Your Stats */}
      {userRank > 0 && (
        <YourStatsCard
          rank={userRank}
          activityCount={userActivityCount}
          totalParticipants={leaderboard.length}
          rankChange={undefined} // TODO: Calculate
          nextBadgeMilestone={getNextBadgeMilestone(userActivityCount)}
        />
      )}

      {/* Top 3 Performers */}
      {leaderboard.length >= 3 && (
        <TopPerformers performers={topPerformers} />
      )}

      {/* Rankings Table */}
      {remainingRanks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-800 px-2">
            Leaderboard Rankings
          </h2>
          <div className="space-y-1">
            {remainingRanks.map((entry, index) => {
              const rank = index + 4
              const isCurrentUser = entry.User.id === currentUserId
              const percentOfTop = topCount > 0 ? Math.round((entry.totalPoints / topCount) * 100) : 0

              return (
                <RankingRow
                  key={entry.User.id}
                  rank={rank}
                  userId={entry.User.id}
                  name={getUserDisplayName(entry.User)}
                  email={entry.User.email}
                  activityCount={entry.totalPoints}
                  percentOfTop={percentOfTop}
                  rankChange={undefined} // TODO: Calculate
                  avatarUrl={null}
                  isCurrentUser={isCurrentUser}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Workspace Stats */}
      <WorkspaceStats
        topCount={topCount}
        averageCount={averageCount}
        participantCount={leaderboard.length}
        hiddenCount={0} // TODO: Get from API
      />
    </div>
  )
}
