'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'

interface LeaderboardItemProps {
  rank: number
  userId: string
  displayName?: string | null
  email: string
  points: number
  maxPoints: number
  positionChange?: number
  workspaceSlug: string
}

export function LeaderboardItem({
  rank,
  userId,
  displayName,
  email,
  points,
  maxPoints,
  positionChange = 0,
  workspaceSlug,
}: LeaderboardItemProps) {
  const initial = (displayName || email)[0].toUpperCase()
  const progress = maxPoints > 0 ? (points / maxPoints) * 100 : 0

  const getPositionChangeIcon = () => {
    if (positionChange > 0) {
      return <TrendingUp className="h-3 w-3 text-green-600" />
    } else if (positionChange < 0) {
      return <TrendingDown className="h-3 w-3 text-red-600" />
    }
    return <Minus className="h-3 w-3 text-gray-400" />
  }

  const getPositionChangeText = () => {
    if (positionChange > 0) {
      return `↑${positionChange}`
    } else if (positionChange < 0) {
      return `↓${Math.abs(positionChange)}`
    }
    return '—'
  }

  return (
    <Link
      href={`/w/${workspaceSlug}/admin/participants/${userId}`}
      className="block hover:bg-gray-50 transition-colors rounded-lg p-3 border"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Badge variant={rank === 1 ? 'default' : 'outline'} className="w-8 justify-center">
            {rank}
          </Badge>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {displayName || email.split('@')[0]}
            </div>
            <Progress value={progress} className="h-1 mt-1" />
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-sm">{points}</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {getPositionChangeIcon()}
            <span>{getPositionChangeText()}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
