import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface RankChangeIndicatorProps {
  change?: number
}

export function RankChangeIndicator({ change }: RankChangeIndicatorProps) {
  if (!change || change === 0) {
    return (
      <div className="flex items-center gap-1 text-slate-400">
        <Minus className="h-4 w-4" />
      </div>
    )
  }

  const isPositive = change > 0
  const Icon = isPositive ? TrendingUp : TrendingDown
  const colorClass = isPositive ? "text-green-600" : "text-red-600"

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{Math.abs(change)}</span>
    </div>
  )
}
