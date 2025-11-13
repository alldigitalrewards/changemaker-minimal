'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, Info, X, Clock } from 'lucide-react'

type AlertPriority = 'critical' | 'high' | 'medium' | 'low'
type AlertCategory = 'submissions' | 'enrollments' | 'rewards' | 'system'

interface AlertAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'outline' | 'destructive'
}

interface AlertItemProps {
  id: string
  priority: AlertPriority
  category: AlertCategory
  title: string
  description: string
  icon?: React.ReactNode
  actions?: AlertAction[]
  onDismiss?: (id: string) => void
  onSnooze?: (id: string) => void
  expandable?: boolean
  details?: string
}

export function AlertItem({
  id,
  priority,
  category,
  title,
  description,
  icon,
  actions,
  onDismiss,
  onSnooze,
  expandable = false,
  details,
}: AlertItemProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const priorityStyles = {
    critical: 'bg-red-50 border-red-200 text-red-900',
    high: 'bg-orange-50 border-orange-200 text-orange-900',
    medium: 'bg-amber-50 border-amber-200 text-amber-900',
    low: 'bg-blue-50 border-blue-200 text-blue-900',
  }

  const priorityBadges = {
    critical: <Badge variant="destructive" className="text-xs">Critical</Badge>,
    high: <Badge variant="default" className="text-xs bg-orange-500">High</Badge>,
    medium: <Badge variant="default" className="text-xs bg-amber-500">Medium</Badge>,
    low: <Badge variant="outline" className="text-xs">Low</Badge>,
  }

  const priorityIcons = {
    critical: <AlertTriangle className="h-4 w-4 text-red-600" />,
    high: <AlertCircle className="h-4 w-4 text-orange-600" />,
    medium: <AlertCircle className="h-4 w-4 text-amber-600" />,
    low: <Info className="h-4 w-4 text-blue-600" />,
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.(id)
  }

  const handleSnooze = () => {
    setDismissed(true)
    onSnooze?.(id)
  }

  return (
    <div className={`flex items-start justify-between p-3 border rounded-md ${priorityStyles[priority]}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {icon || priorityIcons[priority]}
          {priorityBadges[priority]}
          <span className="text-xs text-gray-600 uppercase tracking-wide">{category}</span>
        </div>
        <div className="text-sm font-medium mb-1">{title}</div>
        <div className="text-xs opacity-90">{description}</div>
        {details && (
          <div className="mt-2 text-xs opacity-75 whitespace-pre-line">{details}</div>
        )}
      </div>
      <div className="flex items-start gap-1 ml-3">
        {actions && actions.length > 0 && (
          <div className="flex gap-1">
            {actions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={action.variant || 'outline'}
                className="h-7 text-xs"
                onClick={action.onClick}
                asChild={!!action.href}
              >
                {action.href ? <a href={action.href}>{action.label}</a> : action.label}
              </Button>
            ))}
          </div>
        )}
        {onSnooze && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleSnooze}
            title="Snooze for 24 hours"
          >
            <Clock className="h-3 w-3" />
          </Button>
        )}
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleDismiss}
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
