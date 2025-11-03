import { User } from '@prisma/client'

/**
 * User display and formatting utilities for CRM operations
 */

type UserForDisplay = Pick<User, 'firstName' | 'lastName' | 'displayName' | 'email'>

/**
 * Gets the most appropriate display name for a user.
 * Priority: displayName > firstName lastName > firstName > email username
 */
export function getUserDisplayName(user: UserForDisplay): string {
  // Use explicit displayName if set
  if (user.displayName && user.displayName.trim() !== '') {
    return user.displayName
  }

  // Construct from firstName/lastName
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  }

  // Fallback to email username
  return user.email.split('@')[0]
}

/**
 * Gets the formal full name for certificates, formal communications.
 * Returns "firstName lastName" or falls back to email if names not available.
 */
export function getUserFullName(user: UserForDisplay): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) {
    return user.firstName
  }
  if (user.lastName) {
    return user.lastName
  }
  // Fallback to displayName or email
  return user.displayName || user.email
}

/**
 * Gets initials for avatar display.
 * Returns first letters of firstName and lastName, or displayName, or email.
 */
export function getUserInitials(user: UserForDisplay): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }
  if (user.firstName) {
    return user.firstName[0].toUpperCase()
  }
  if (user.displayName && user.displayName.length > 0) {
    const parts = user.displayName.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return user.displayName.substring(0, 2).toUpperCase()
  }
  return user.email.substring(0, 2).toUpperCase()
}

type UserWithAddress = Pick<User, 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'zipCode' | 'country'>

/**
 * Formats a complete mailing address for shipping labels/reward fulfillment.
 * Returns null if address is incomplete.
 */
export function formatMailingAddress(user: UserWithAddress): string | null {
  if (!user.addressLine1 || !user.city || !user.state || !user.zipCode) {
    return null // Incomplete address
  }

  const lines = [
    user.addressLine1,
    user.addressLine2,
    `${user.city}, ${user.state} ${user.zipCode}`,
    user.country || 'USA'
  ].filter(Boolean)

  return lines.join('\n')
}

/**
 * Checks if user has a complete shipping address for physical rewards.
 */
export function hasCompleteAddress(user: UserWithAddress): boolean {
  return !!(
    user.addressLine1 &&
    user.city &&
    user.state &&
    user.zipCode
  )
}

/**
 * Formats phone number for display (basic US formatting).
 * Returns the phone as-is if it doesn't match US pattern.
 */
export function formatPhoneNumber(phone: string | null): string | null {
  if (!phone) return null

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // Format as (XXX) XXX-XXXX for 10-digit US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // Return as-is for non-standard formats
  return phone
}
