import { Avatar } from "./avatar"
import { RankChangeIndicator } from "./rank-change-indicator"
import { ActivityBadges } from "./medal-badge"
import { ProgressBar } from "./progress-bar"
import { Badge } from "@/components/ui/badge"

interface RankingRowProps {
  rank: number
  userId: string
  name: string
  email: string
  activityCount: number
  percentOfTop: number
  rankChange?: number
  avatarUrl?: string | null
  isCurrentUser?: boolean
  isHidden?: boolean
}

export function RankingRow({
  rank,
  userId,
  name,
  email,
  activityCount,
  percentOfTop,
  rankChange,
  avatarUrl,
  isCurrentUser = false,
  isHidden = false
}: RankingRowProps) {
  const borderClass = isCurrentUser
    ? 'border-l-4 border-coral-500 bg-coral-50/30'
    : rank <= Math.ceil(100 * 0.1)
    ? 'border-l-4 border-amber-400'
    : rank <= Math.ceil(100 * 0.25)
    ? 'border-l-4 border-slate-400'
    : rank <= Math.ceil(100 * 0.5)
    ? 'border-l-4 border-amber-700'
    : ''

  return (
    <div
      className={`
        flex items-center gap-4 p-4
        transition-all duration-200
        hover:bg-slate-100 hover:scale-[1.01] hover:shadow-md
        ${rank % 2 === 0 ? 'bg-slate-50' : 'bg-white'}
        ${borderClass}
        ${isHidden ? 'opacity-70' : ''}
        rounded-lg
      `}
    >
      {/* Rank */}
      <div className="w-12 text-center">
        <div className="text-lg font-bold text-slate-700">
          {rank}
        </div>
      </div>

      {/* Avatar */}
      <Avatar
        name={name}
        email={email}
        avatarUrl={avatarUrl}
        size="md"
      />

      {/* User Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className={`font-semibold text-slate-900 truncate ${isHidden ? 'italic' : ''}`}>
            {name}
          </p>
          {isCurrentUser && (
            <Badge className="bg-coral-500 hover:bg-coral-600 text-white text-xs px-2 py-0.5">
              You
            </Badge>
          )}
          {isHidden && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              Private
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 truncate">
          {isHidden ? 'Privacy enabled - only you can see this' : email}
        </p>
        <div className="flex items-center gap-2">
          <ProgressBar value={percentOfTop} className="h-1.5 max-w-xs" />
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {percentOfTop}% of top
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="hidden md:block">
        <ActivityBadges activityCount={activityCount} />
      </div>

      {/* Activity Count */}
      <div className="text-right min-w-[80px]">
        <div className="text-2xl font-bold text-slate-900">
          {activityCount}
        </div>
        <div className="text-xs text-slate-500">completed</div>
      </div>

      {/* Rank Change */}
      <div className="min-w-[60px] flex justify-center">
        <RankChangeIndicator change={rankChange} />
      </div>
    </div>
  )
}
