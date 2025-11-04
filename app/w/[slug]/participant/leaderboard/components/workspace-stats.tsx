import { Card, CardContent } from "@/components/ui/card"
import { Crown, BarChart, Users, Lock } from "lucide-react"

interface WorkspaceStatsProps {
  topCount: number
  averageCount: number
  participantCount: number
  hiddenCount: number
}

export function WorkspaceStats({
  topCount,
  averageCount,
  participantCount,
  hiddenCount
}: WorkspaceStatsProps) {
  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Workspace Statistics
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Top */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Crown className="h-5 w-5 text-amber-500" />
              <span>Top</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900">{topCount}</p>
              <p className="text-xs text-slate-500">activities</p>
            </div>
          </div>

          {/* Average */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <BarChart className="h-5 w-5 text-blue-500" />
              <span>Average</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900">{averageCount}</p>
              <p className="text-xs text-slate-500">activities</p>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="h-5 w-5 text-green-500" />
              <span>Participants</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900">{participantCount}</p>
              <p className="text-xs text-slate-500">active</p>
            </div>
          </div>

          {/* Hidden */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Lock className="h-5 w-5 text-slate-500" />
              <span>Hidden</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900">{hiddenCount}</p>
              <p className="text-xs text-slate-500">by choice</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4">
          Last updated: Just now
        </p>
      </CardContent>
    </Card>
  )
}
