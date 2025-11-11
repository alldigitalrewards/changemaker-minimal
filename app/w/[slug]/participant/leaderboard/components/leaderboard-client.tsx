"use client"

import { useState, useEffect } from "react"
import { TimePeriodTabs } from "./time-period-tabs"
import { ChallengeFilter } from "./challenge-filter"
import { YourStatsCard } from "./your-stats-card"
import { TopPerformers } from "./top-performers"
import { RankingRow } from "./ranking-row"
import { WorkspaceStats } from "./workspace-stats"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

type TimePeriod = 'all' | 'month' | 'week' | 'day'

interface LeaderboardData {
  leaderboard: {
    userId: string
    name: string
    email: string
    activityCount: number
    avatarUrl: string | null
  }[]
  stats: {
    topCount: number
    averageCount: number
    participantCount: number
    hiddenCount: number
  }
}

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
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Convert initial data to new format
  const initialData: LeaderboardData = {
    leaderboard: initialLeaderboard.map(entry => ({
      userId: entry.User.id,
      name: getUserDisplayName(entry.User),
      email: entry.User.email,
      activityCount: entry.totalPoints,
      avatarUrl: null
    })),
    stats: {
      topCount: initialLeaderboard[0]?.totalPoints || 0,
      averageCount: initialLeaderboard.length
        ? Math.round(initialLeaderboard.reduce((s, e) => s + e.totalPoints, 0) / initialLeaderboard.length)
        : 0,
      participantCount: initialLeaderboard.length,
      hiddenCount: 0
    }
  }

  // Fetch filtered data when filters change
  useEffect(() => {
    async function fetchLeaderboard() {
      if (timePeriod === 'all' && selectedChallenge === 'all') {
        setLeaderboardData(initialData)
        return
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (timePeriod !== 'all') params.set('period', timePeriod)
        if (selectedChallenge !== 'all') params.set('challengeId', selectedChallenge)

        const response = await fetch(`/api/workspaces/${workspaceName.toLowerCase().replace(/\s+/g, '-')}/leaderboard?${params}`)
        if (response.ok) {
          const data = await response.json()
          setLeaderboardData(data)
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [timePeriod, selectedChallenge])

  // Use current or initial data
  const currentData = leaderboardData || initialData
  const leaderboard = currentData.leaderboard

  const userIndex = leaderboard.findIndex(entry => entry.userId === currentUserId)
  const userRank = userIndex >= 0 ? userIndex + 1 : 0
  const userActivityCount = userIndex >= 0 ? leaderboard[userIndex].activityCount : 0

  const { topCount, averageCount, participantCount, hiddenCount } = currentData.stats

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export CSV')
  }

  // Prepare top 3 performers
  const topPerformers: [
    typeof leaderboard[0] | undefined,
    typeof leaderboard[1] | undefined,
    typeof leaderboard[2] | undefined
  ] = [
    leaderboard[0],
    leaderboard[1],
    leaderboard[2]
  ]

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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        </div>
      )}

      {/* Your Stats */}
      {!isLoading && userRank > 0 && (
        <YourStatsCard
          rank={userRank}
          activityCount={userActivityCount}
          totalParticipants={leaderboard.length}
          rankChange={undefined}
          nextBadgeMilestone={getNextBadgeMilestone(userActivityCount)}
        />
      )}

      {/* Top 3 Performers */}
      {!isLoading && leaderboard.length >= 3 && (
        <TopPerformers performers={topPerformers} />
      )}

      {/* Rankings Table */}
      {!isLoading && remainingRanks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-800 px-2">
            Leaderboard Rankings
          </h2>
          <div className="space-y-1">
            {remainingRanks.map((entry, index) => {
              const rank = index + 4
              const isCurrentUser = entry.userId === currentUserId
              const percentOfTop = topCount > 0 ? Math.round((entry.activityCount / topCount) * 100) : 0

              return (
                <RankingRow
                  key={entry.userId}
                  rank={rank}
                  userId={entry.userId}
                  name={entry.name}
                  email={entry.email}
                  activityCount={entry.activityCount}
                  percentOfTop={percentOfTop}
                  rankChange={undefined}
                  avatarUrl={entry.avatarUrl}
                  isCurrentUser={isCurrentUser}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Workspace Stats */}
      {!isLoading && (
        <WorkspaceStats
          topCount={topCount}
          averageCount={averageCount}
          participantCount={participantCount}
          hiddenCount={hiddenCount}
        />
      )}
    </div>
  )
}
