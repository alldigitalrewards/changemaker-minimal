/**
 * NOTIFICATION SERVICE
 * ====================
 *
 * High-level notification creation service with business logic.
 * Auto-creates notifications based on application events.
 */

import {
  createNotification,
  notificationExists,
} from '@/lib/db/notifications'
import { prisma } from '@/lib/prisma'
import type { NotificationType } from '@prisma/client'

/**
 * Create shipping address required notification
 */
export async function createShippingAddressNotification(params: {
  userId: string
  workspaceId: string
  workspaceSlug: string
  skuName: string
  rewardIssuanceId: string
}): Promise<void> {
  const exists = await notificationExists(
    params.userId,
    params.workspaceId,
    'SHIPPING_ADDRESS_REQUIRED'
  )

  if (exists) return

  await createNotification({
    userId: params.userId,
    workspaceId: params.workspaceId,
    type: 'SHIPPING_ADDRESS_REQUIRED',
    title: 'Shipping Address Required',
    message: `Your reward "${params.skuName}" is ready! Please add your shipping address to complete delivery.`,
    actionUrl: `/w/${params.workspaceSlug}/participant/profile?section=address&reward=${params.rewardIssuanceId}`,
    actionText: 'Add Shipping Address',
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  })
}

/**
 * Create reward issued notification
 */
export async function createRewardIssuedNotification(params: {
  userId: string
  workspaceId: string
  workspaceSlug: string
  rewardType: 'points' | 'sku'
  amount?: number
  skuName?: string
}): Promise<void> {
  const message =
    params.rewardType === 'points'
      ? `You've earned ${params.amount} points!`
      : `You've earned "${params.skuName}"!`

  await createNotification({
    userId: params.userId,
    workspaceId: params.workspaceId,
    type: 'REWARD_ISSUED',
    title: 'Reward Earned!',
    message,
    actionUrl: `/w/${params.workspaceSlug}/participant/dashboard`,
    actionText: 'View Dashboard',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })
}

/**
 * Create submission approved notification
 */
export async function createSubmissionApprovedNotification(params: {
  userId: string
  workspaceId: string
  workspaceSlug: string
  activityName: string
  challengeId: string
  pointsAwarded?: number
}): Promise<void> {
  const message = params.pointsAwarded
    ? `Your submission for "${params.activityName}" was approved! You earned ${params.pointsAwarded} points.`
    : `Your submission for "${params.activityName}" was approved!`

  await createNotification({
    userId: params.userId,
    workspaceId: params.workspaceId,
    type: 'SUBMISSION_APPROVED',
    title: 'Submission Approved',
    message,
    actionUrl: `/w/${params.workspaceSlug}/participant/challenges/${params.challengeId}`,
    actionText: 'View Challenge',
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  })
}

/**
 * Check if user has incomplete shipping address
 */
export async function hasIncompleteShippingAddress(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      addressLine1: true,
      city: true,
      state: true,
      zipCode: true,
      country: true,
    },
  })

  if (!user) return true

  return !user.addressLine1 || !user.city || !user.state || !user.zipCode || !user.country
}
