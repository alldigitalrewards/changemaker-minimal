'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TrendDataPoint {
  value: number
  label?: string
}

interface EnhancedMetricCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trendData?: TrendDataPoint[]
  trendPercent?: number
  trendUp?: boolean
  subtitle?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function EnhancedMetricCard({
  title,
  value,
  icon,
  trendData,
  trendPercent,
  trendUp,
  subtitle = 'vs last 7 days',
  variant = 'default',
}: EnhancedMetricCardProps) {
  const variantStyles = {
    default: 'border-gray-200',
    success: 'border-green-200 bg-gradient-to-br from-green-50 to-white',
    warning: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
    danger: 'border-red-200 bg-gradient-to-br from-red-50 to-white',
  }

  return (
    <Card className={`${variantStyles[variant]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-2xl font-bold">{value}</div>
          {trendPercent !== undefined && (
            <Badge variant={trendUp ? 'default' : 'secondary'} className="gap-1">
              {trendUp ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trendPercent)}%
            </Badge>
          )}
        </div>
        {trendData && trendData.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
