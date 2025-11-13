/**
 * NOTIFICATION DATABASE QUERIES
 * ==============================
 *
 * Workspace-isolated notification queries for the participant inbox system.
 * Supports creating, reading, marking as read/dismissed, and auto-expiry.
 */

import { prisma } from '@/lib/prisma'
import type { Notification, NotificationType } from '@prisma/client'

export interface CreateNotificationParams {
  userId: string
  workspaceId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  actionText?: string
  expiresAt?: Date
}

export interface NotificationWithCounts extends Notification {
  _count?: {
    unread: number
    total: number
  }
}

/**
 * Create a new notification for a user
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      workspaceId: params.workspaceId,
      type: params.type,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      actionText: params.actionText,
      expiresAt: params.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    },
  })
}

/**
 * Get all notifications for a user in a workspace
 */
export async function getUserNotifications(
  userId: string,
  workspaceId: string,
  options: {
    includeRead?: boolean
    includeDismissed?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<Notification[]> {
  const {
    includeRead = true,
    includeDismissed = false,
    limit = 50,
    offset = 0,
  } = options

  const where: any = {
    userId,
    workspaceId,
    OR: [
      { expiresAt: null },
      { expiresAt: { gte: new Date() } },
    ],
  }

  if (!includeRead) {
    where.read = false
  }

  if (!includeDismissed) {
    where.dismissed = false
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

/**
 * Get unread notification count for a user in a workspace
 */
export async function getUnreadNotificationCount(
  userId: string,
  workspaceId: string
): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      workspaceId,
      read: false,
      dismissed: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
  })
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<Notification> {
  return prisma.notification.update({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  })
}

/**
 * Mark multiple notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds: string[],
  userId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  })

  return result.count
}

/**
 * Mark all notifications as read for a user in a workspace
 */
export async function markAllNotificationsAsRead(
  userId: string,
  workspaceId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      workspaceId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  })

  return result.count
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(
  notificationId: string,
  userId: string
): Promise<Notification> {
  return prisma.notification.update({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      dismissed: true,
      dismissedAt: new Date(),
    },
  })
}

/**
 * Delete expired notifications (cleanup job)
 */
export async function deleteExpiredNotifications(): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  return result.count
}

/**
 * Check if a notification of a specific type already exists for a user
 * Useful to prevent duplicate notifications
 */
export async function notificationExists(
  userId: string,
  workspaceId: string,
  type: NotificationType,
  additionalWhere?: Record<string, any>
): Promise<boolean> {
  const count = await prisma.notification.count({
    where: {
      userId,
      workspaceId,
      type,
      dismissed: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
      ...additionalWhere,
    },
  })

  return count > 0
}

/**
 * Get notification by ID (with ownership check)
 */
export async function getNotificationById(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  })
}
