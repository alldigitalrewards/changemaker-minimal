/**
 * SECURE TOKEN GENERATION AND VALIDATION
 * ========================================
 *
 * Provides JWT-based token generation for secure, time-limited URLs.
 * Used for email confirmation links and other authenticated operations.
 */

import * as jwt from 'jsonwebtoken'
import { AuditLogger } from '@/lib/audit-log'

const getSecretKey = () => {
  const secret = process.env.CONFIRMATION_TOKEN_SECRET
  if (!secret) {
    throw new Error('CONFIRMATION_TOKEN_SECRET environment variable is not set')
  }
  // Validate secret strength (minimum 32 characters for HS256)
  if (secret.length < 32) {
    throw new Error(
      'CONFIRMATION_TOKEN_SECRET must be at least 32 characters for adequate security. ' +
      `Current length: ${secret.length}`
    )
  }
  return secret
}

interface ConfirmationTokenPayload {
  rewardIssuanceId: string
  userId: string
  workspaceId: string
}

/**
 * Generate a secure, time-limited confirmation token
 * @param payload Token payload containing IDs for validation
 * @param expiresInHours Token expiration time (default: 24 hours)
 * @returns JWT token string
 */
export async function generateConfirmationToken(
  payload: ConfirmationTokenPayload,
  expiresInHours: number = 24
): Promise<string> {
  const secret = getSecretKey()

  const token = jwt.sign(
    payload,
    secret,
    {
      expiresIn: `${expiresInHours}h`,
      issuer: 'changemaker',
      algorithm: 'HS256',
    }
  )

  // Audit log token generation
  await AuditLogger.tokenGenerated({
    userId: payload.userId,
    workspaceId: payload.workspaceId,
    purpose: `shipping_confirmation:${payload.rewardIssuanceId}`,
  })

  return token
}

/**
 * Verify and decode a confirmation token
 * @param token JWT token to verify
 * @returns Decoded payload if valid, null if invalid or expired
 */
export async function verifyConfirmationToken(
  token: string
): Promise<ConfirmationTokenPayload | null> {
  try {
    const secret = getSecretKey()

    const decoded = jwt.verify(token, secret, {
      issuer: 'changemaker',
      algorithms: ['HS256'],
    }) as ConfirmationTokenPayload

    // Audit log successful verification
    await AuditLogger.tokenVerified({
      userId: decoded.userId,
      workspaceId: decoded.workspaceId,
      rewardIssuanceId: decoded.rewardIssuanceId,
    })

    return decoded
  } catch (error) {
    // Token is invalid, expired, or malformed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Audit log failed verification (security event)
    await AuditLogger.tokenVerificationFailed({
      reason: errorMessage,
      token,
    })

    console.error('Token verification failed:', error)
    return null
  }
}
