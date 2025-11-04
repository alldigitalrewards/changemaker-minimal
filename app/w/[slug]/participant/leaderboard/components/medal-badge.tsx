import { Trophy, Target, Star, Gem } from "lucide-react"

interface MedalBadgeProps {
  rank: number
}

export function MedalBadge({ rank }: MedalBadgeProps) {
  switch (rank) {
    case 1:
      return (
        <div className="relative">
          <span className="text-4xl">🏆</span>
          <span className="absolute -top-1 -right-1 text-2xl">👑</span>
        </div>
      )
    case 2:
      return <span className="text-4xl">🥈</span>
    case 3:
      return <span className="text-4xl">🥉</span>
    default:
      return null
  }
}

interface ActivityBadgesProps {
  activityCount: number
}

export function ActivityBadges({ activityCount }: ActivityBadgesProps) {
  const badges = []

  if (activityCount >= 100) badges.push({ icon: Gem, label: "100 activities", color: "text-purple-500" })
  else if (activityCount >= 50) badges.push({ icon: Star, label: "50 activities", color: "text-amber-500" })
  else if (activityCount >= 25) badges.push({ icon: Target, label: "25 activities", color: "text-blue-500" })
  else if (activityCount >= 10) badges.push({ icon: Trophy, label: "10 activities", color: "text-green-500" })

  if (badges.length === 0) return null

  return (
    <div className="flex items-center gap-1">
      {badges.map((badge, index) => {
        const Icon = badge.icon
        return (
          <div key={index} title={badge.label}>
            <Icon className={`h-4 w-4 ${badge.color}`} />
          </div>
        )
      })}
    </div>
  )
}
