'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell,
  X,
  Check,
  Package,
  Trophy,
  MessageSquare,
  AlertCircle,
  CheckCheck,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import type { Notification, NotificationType } from '@prisma/client'

interface NotificationInboxProps {
  workspaceSlug: string
  initialNotifications: Notification[]
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

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  SHIPPING_ADDRESS_REQUIRED: 'bg-orange-100 text-orange-600',
  REWARD_ISSUED: 'bg-green-100 text-green-600',
  SUBMISSION_APPROVED: 'bg-blue-100 text-blue-600',
  SUBMISSION_REJECTED: 'bg-red-100 text-red-600',
  CHALLENGE_INVITED: 'bg-purple-100 text-purple-600',
  CHALLENGE_ENROLLED: 'bg-indigo-100 text-indigo-600',
  ANNOUNCEMENT: 'bg-gray-100 text-gray-600',
  SYSTEM: 'bg-yellow-100 text-yellow-600',
}

export function NotificationInbox({
  workspaceSlug,
  initialNotifications,
}: NotificationInboxProps) {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>(initialNotifications)
  const [readNotifications, setReadNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'unread' | 'all' | 'read'>('unread')

  const fetchNotifications = async (includeRead: boolean, includeDismissed: boolean) => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/notifications?includeRead=${includeRead}&includeDismissed=${includeDismissed}&limit=100`
      )
      if (response.ok) {
        const data = await response.json()
        return data.notifications
      }
      return []
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const loadTabData = async (tab: 'unread' | 'all' | 'read') => {
    if (tab === 'unread') {
      const notifications = await fetchNotifications(false, false)
      setUnreadNotifications(notifications)
    } else if (tab === 'all') {
      const notifications = await fetchNotifications(true, false)
      setAllNotifications(notifications)
    } else if (tab === 'read') {
      const notifications = await fetchNotifications(true, false)
      setReadNotifications(notifications.filter((n: Notification) => n.read))
    }
  }

  useEffect(() => {
    loadTabData(activeTab)
  }, [activeTab])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/notifications/${notificationId}/read`,
        { method: 'POST' }
      )
      if (response.ok) {
        // Remove from unread list
        setUnreadNotifications(prev => prev.filter(n => n.id !== notificationId))
        // Refresh current tab
        loadTabData(activeTab)
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleDismiss = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/notifications/${notificationId}/dismiss`,
        { method: 'POST' }
      )
      if (response.ok) {
        // Remove from all lists
        setUnreadNotifications(prev => prev.filter(n => n.id !== notificationId))
        setAllNotifications(prev => prev.filter(n => n.id !== notificationId))
        setReadNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('Failed to dismiss:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      })
      if (response.ok) {
        setUnreadNotifications([])
        loadTabData(activeTab)
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const renderNotifications = (notifications: Notification[]) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="p-4">
              <div className="h-20 bg-gray-100 animate-pulse rounded" />
            </Card>
          ))}
        </div>
      )
    }

    if (notifications.length === 0) {
      return (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <Inbox className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No notifications</p>
            <p className="text-sm mt-1">
              {activeTab === 'unread'
                ? "You're all caught up!"
                : 'No notifications to display'}
            </p>
          </div>
        </Card>
      )
    }

    return (
      <div className="space-y-3">
        {notifications.map(notification => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="unread" className="relative">
              Unread
              {unreadNotifications.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-coral-500 text-white hover:bg-coral-600"
                >
                  {unreadNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>

          {unreadNotifications.length > 0 && activeTab === 'unread' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="flex items-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        <TabsContent value="unread">
          {renderNotifications(unreadNotifications)}
        </TabsContent>

        <TabsContent value="all">
          {renderNotifications(allNotifications)}
        </TabsContent>

        <TabsContent value="read">
          {renderNotifications(readNotifications)}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onDismiss,
}: {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const Icon = NOTIFICATION_ICONS[notification.type]
  const colorClass = NOTIFICATION_COLORS[notification.type]

  const content = (
    <Card className={`p-4 transition-all hover:shadow-md ${!notification.read ? 'border-l-4 border-l-coral-500' : ''}`}>
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{notification.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onMarkAsRead(notification.id)
                  }}
                  className="h-8 text-xs"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDismiss(notification.id)
                }}
                className="h-8 w-8"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
            {notification.read && notification.readAt && (
              <span className="flex items-center gap-1">
                <CheckCheck className="h-3 w-3" />
                Read {formatDistanceToNow(new Date(notification.readAt), { addSuffix: true })}
              </span>
            )}
          </div>
          {notification.actionText && notification.actionUrl && (
            <div className="mt-3">
              <Button
                asChild
                size="sm"
                className="bg-coral-500 hover:bg-coral-600"
              >
                <Link href={notification.actionUrl}>
                  {notification.actionText}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )

  if (notification.actionUrl && !notification.read) {
    return (
      <Link href={notification.actionUrl} onClick={() => onMarkAsRead(notification.id)}>
        {content}
      </Link>
    )
  }

  return content
}
