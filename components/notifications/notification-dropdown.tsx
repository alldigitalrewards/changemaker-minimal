'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Bell, X, Check, Package, Trophy, MessageSquare, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Notification, NotificationType } from '@prisma/client'

interface NotificationDropdownProps {
  workspaceSlug: string
  onMarkAllRead: () => void
  onNotificationRead: () => void
  onNotificationDismiss: () => void
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  SHIPPING_ADDRESS_REQUIRED: Package,
  REWARD_ISSUED: Trophy,
  SUBMISSION_APPROVED: Check,
  SUBMISSION_REJECTED: X,
  CHALLENGE_INVITED: MessageSquare,
  CHALLENGE_ENROLLED: Trophy,
  ANNOUNCEMENT: Bell,
  SYSTEM: AlertCircle,
}

export function NotificationDropdown({
  workspaceSlug,
  onMarkAllRead,
  onNotificationRead,
  onNotificationDismiss,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/notifications?includeRead=false&limit=5`
      )
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [workspaceSlug])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/notifications/${notificationId}/read`,
        { method: 'POST' }
      )
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        onNotificationRead()
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleDismiss = async (notificationId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/notifications/${notificationId}/dismiss`,
        { method: 'POST' }
      )
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        onNotificationDismiss()
      }
    } catch (error) {
      console.error('Failed to dismiss:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-h-96">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-sm font-semibold">Notifications</h3>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="h-7 text-xs"
          >
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">
          <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No new notifications</p>
        </div>
      ) : (
        <div className="overflow-y-auto max-h-80">
          {notifications.map(notification => {
            const Icon = NOTIFICATION_ICONS[notification.type]
            return (
              <div
                key={notification.id}
                className="group border-b last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                {notification.actionUrl ? (
                  <Link
                    href={notification.actionUrl}
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="block p-4"
                  >
                    <NotificationContent
                      notification={notification}
                      Icon={Icon}
                      onDismiss={handleDismiss}
                    />
                  </Link>
                ) : (
                  <div className="p-4">
                    <NotificationContent
                      notification={notification}
                      Icon={Icon}
                      onDismiss={handleDismiss}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="p-3 border-t bg-gray-50">
        <Link
          href={`/w/${workspaceSlug}/participant/notifications`}
          className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View all notifications
        </Link>
      </div>
    </div>
  )
}

function NotificationContent({
  notification,
  Icon,
  onDismiss,
}: {
  notification: Notification
  Icon: React.ComponentType<{ className?: string }>
  onDismiss: (id: string, e: React.MouseEvent) => void
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => onDismiss(notification.id, e)}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {notification.actionText && (
          <div className="mt-2">
            <span className="text-xs font-medium text-blue-600">
              {notification.actionText} →
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
