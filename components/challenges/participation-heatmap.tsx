'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { format, eachDayOfInterval, startOfDay } from 'date-fns'

interface DayActivity {
  date: Date
  activityCount: number
}

interface ParticipationHeatmapProps {
  startDate: Date
  endDate: Date
  activities: DayActivity[]
}

export function ParticipationHeatmap({ startDate, endDate, activities }: ParticipationHeatmapProps) {
  // Generate all days in the challenge period
  const allDays = eachDayOfInterval({
    start: startOfDay(startDate),
    end: startOfDay(endDate),
  })

  // Create a map of date strings to activity counts
  const activityMap = new Map<string, number>()
  activities.forEach((activity) => {
    const dateKey = format(activity.date, 'yyyy-MM-dd')
    activityMap.set(dateKey, activity.activityCount)
  })

  // Get max activity count for color scaling
  const maxActivity = Math.max(...activities.map((a) => a.activityCount), 1)

  // Get color class based on activity count
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    const intensity = count / maxActivity
    if (intensity < 0.2) return 'bg-green-200'
    if (intensity < 0.4) return 'bg-green-400'
    if (intensity < 0.6) return 'bg-green-600'
    if (intensity < 0.8) return 'bg-green-700'
    return 'bg-green-800'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participation Heatmap</CardTitle>
        <CardDescription>Daily activity levels over the challenge period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const activityCount = activityMap.get(dateKey) || 0
            return (
              <TooltipProvider key={dateKey}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`aspect-square rounded border cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${getHeatmapColor(
                        activityCount
                      )}`}
                      aria-label={`${format(day, 'MMM d, yyyy')}: ${activityCount} activities`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{format(day, 'MMM d, yyyy')}</p>
                    <p className="text-sm">
                      {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded border bg-gray-100" />
            <div className="w-3 h-3 rounded border bg-green-200" />
            <div className="w-3 h-3 rounded border bg-green-400" />
            <div className="w-3 h-3 rounded border bg-green-600" />
            <div className="w-3 h-3 rounded border bg-green-800" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}
