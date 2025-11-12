/**
 * Analytics Event Tracking
 *
 * This module provides functions to track user events throughout the onboarding
 * and participant journey. Currently uses console.log for debugging.
 *
 * Future: Replace with actual analytics provider (PostHog, Mixpanel, etc.)
 */

export type AnalyticsEvent =
  | 'invite_page_viewed'
  | 'signup_started'
  | 'signup_completed'
  | 'invite_accepted'
  | 'profile_completed'
  | 'first_challenge_joined'
  | 'email_verification_sent'
  | 'email_verification_completed'
  | 'onboarding_checklist_viewed'

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Track an analytics event
 * @param event - The event name
 * @param properties - Additional properties for the event
 */
export function trackEvent(event: AnalyticsEvent, properties?: EventProperties) {
  const timestamp = new Date().toISOString()
  const eventData = {
    event,
    timestamp,
    properties: properties || {}
  }

  // Console logging for now - replace with actual analytics provider
  console.log('[ANALYTICS]', JSON.stringify(eventData, null, 2))

  // TODO: Replace with actual analytics implementation
  // Example:
  // if (typeof window !== 'undefined' && window.analytics) {
  //   window.analytics.track(event, properties)
  // }
  // or
  // await fetch('/api/analytics/track', {
  //   method: 'POST',
  //   body: JSON.stringify(eventData)
  // })
}

/**
 * Track invite page view
 */
export function trackInvitePageViewed(properties: {
  inviteCode: string
  workspaceSlug: string
  role: string
  hasUser: boolean
}) {
  trackEvent('invite_page_viewed', properties)
}

/**
 * Track signup flow started
 */
export function trackSignupStarted(properties: {
  hasInvite: boolean
  role?: string
  source?: string
}) {
  trackEvent('signup_started', properties)
}

/**
 * Track successful signup completion
 */
export function trackSignupCompleted(properties: {
  userId: string
  email: string
  role: string
  hasInvite: boolean
  workspaceSlug?: string
}) {
  trackEvent('signup_completed', properties)
}

/**
 * Track invite acceptance
 */
export function trackInviteAccepted(properties: {
  inviteCode: string
  userId: string
  workspaceSlug: string
  role: string
  challengeId?: string
}) {
  trackEvent('invite_accepted', properties)
}

/**
 * Track profile completion
 */
export function trackProfileCompleted(properties: {
  userId: string
  hasProfilePhoto: boolean
  hasPhone: boolean
  hasBio: boolean
  emailNotifications: boolean
  challengeUpdates: boolean
  rewardAlerts: boolean
}) {
  trackEvent('profile_completed', properties)
}

/**
 * Track first challenge joined
 */
export function trackFirstChallengeJoined(properties: {
  userId: string
  challengeId: string
  workspaceSlug: string
  enrollmentDate: string
}) {
  trackEvent('first_challenge_joined', properties)
}

/**
 * Track email verification sent
 */
export function trackEmailVerificationSent(properties: {
  email: string
  userId?: string
}) {
  trackEvent('email_verification_sent', properties)
}

/**
 * Track email verification completed
 */
export function trackEmailVerificationCompleted(properties: {
  email: string
  userId: string
}) {
  trackEvent('email_verification_completed', properties)
}

/**
 * Track onboarding checklist viewed
 */
export function trackOnboardingChecklistViewed(properties: {
  userId: string
  workspaceSlug: string
  completedSteps: number
  totalSteps: number
}) {
  trackEvent('onboarding_checklist_viewed', properties)
}

/**
 * Helper to identify a user (sets user properties)
 */
export function identifyUser(properties: {
  userId: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: string
  createdAt: Date
}) {
  const userData = {
    userId: properties.userId,
    email: properties.email,
    firstName: properties.firstName,
    lastName: properties.lastName,
    role: properties.role,
    createdAt: properties.createdAt.toISOString()
  }

  console.log('[ANALYTICS] IDENTIFY USER', JSON.stringify(userData, null, 2))

  // TODO: Replace with actual analytics implementation
  // Example:
  // if (typeof window !== 'undefined' && window.analytics) {
  //   window.analytics.identify(properties.userId, userData)
  // }
}

/**
 * Helper to track page views
 */
export function trackPageView(properties: {
  page: string
  path: string
  title?: string
  userId?: string
}) {
  console.log('[ANALYTICS] PAGE VIEW', JSON.stringify(properties, null, 2))

  // TODO: Replace with actual analytics implementation
}
