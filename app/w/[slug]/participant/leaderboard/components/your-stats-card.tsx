import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Activity, Award, Target } from "lucide-react"
import { RankChangeIndicator } from "./rank-change-indicator"
import { ProgressBar } from "./progress-bar"

interface YourStatsCardProps {
  rank: number
  activityCount: number
  totalParticipants: number
  rankChange?: number
  nextBadgeMilestone?: {
    count: number
    progress: number
  }
}

export function YourStatsCard({
  rank,
  activityCount,
  totalParticipants,
  rankChange,
  nextBadgeMilestone
}: YourStatsCardProps) {
  const percentile = Math.round((1 - (rank - 1) / totalParticipants) * 100)

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-300 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Your Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Your Rank */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <TrendingUp className="h-4 w-4" />
              <span>Your Rank</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">#{rank}</p>
              <p className="text-xs text-slate-500">Top {percentile}%</p>
            </div>
          </div>

          {/* Activities */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Activity className="h-4 w-4" />
              <span>Activities</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900">{activityCount}</p>
              <p className="text-xs text-slate-500">completed</p>
            </div>
          </div>

          {/* Rank Change */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Target className="h-4 w-4" />
              <span>Rank Change</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center h-12">
                <RankChangeIndicator change={rankChange} />
              </div>
              <p className="text-xs text-slate-500">since last week</p>
            </div>
          </div>

          {/* Next Badge */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Award className="h-4 w-4" />
              <span>Next Badge</span>
            </div>
            <div className="space-y-2">
              {nextBadgeMilestone ? (
                <>
                  <p className="text-2xl font-bold text-slate-900">
                    {nextBadgeMilestone.count}
                    <span className="text-sm font-normal text-slate-500 ml-1">
                      ({nextBadgeMilestone.progress}%)
                    </span>
                  </p>
                  <ProgressBar value={nextBadgeMilestone.progress} className="h-1.5" />
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-slate-900">Max</p>
                  <p className="text-xs text-slate-500">All badges earned!</p>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
