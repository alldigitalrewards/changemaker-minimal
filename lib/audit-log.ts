/**
 * AUDIT LOGGING SYSTEM
 * =====================
 *
 * Logs security-critical events for compliance and debugging.
 * Currently logs to console; can be enhanced to log to database or external service.
 */

export type AuditEventType =
  | 'token_generated'
  | 'token_verified'
  | 'token_verification_failed'
  | 'shipping_confirmed'
  | 'shipping_confirmation_failed'
  | 'rate_limit_exceeded'
  | 'auth_failed'
  | 'unauthorized_access'

export interface AuditLogEntry {
  timestamp: Date
  type: AuditEventType
  userId?: string
  workspaceId?: string
  ip?: string
  metadata?: Record<string, any>
  severity: 'info' | 'warning' | 'error' | 'critical'
}

/**
 * Log a security or audit event
 * @param event Audit event details
 */
export async function logAuditEvent(event: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  const entry: AuditLogEntry = {
    timestamp: new Date(),
    ...event,
  }

  // Log to console (structured logging)
  const logLevel = event.severity === 'critical' || event.severity === 'error' ? 'error' : 'info'
  console[logLevel]('[AUDIT]', JSON.stringify(entry, null, 2))

  // TODO: Add database logging when AuditLog model is added to schema
  // await prisma.auditLog.create({ data: entry })

  // TODO: Add external service logging (e.g., Sentry, DataDog) for production
  // if (process.env.NODE_ENV === 'production') {
  //   await externalLogger.log(entry)
  // }
}

/**
 * Helper functions for common audit events
 */
export const AuditLogger = {
  /**
   * Log token generation
   */
  tokenGenerated: (params: { userId: string; workspaceId: string; purpose: string }) =>
    logAuditEvent({
      type: 'token_generated',
      userId: params.userId,
      workspaceId: params.workspaceId,
      metadata: { purpose: params.purpose },
      severity: 'info',
    }),

  /**
   * Log successful token verification
   */
  tokenVerified: (params: { userId: string; workspaceId: string; rewardIssuanceId: string }) =>
    logAuditEvent({
      type: 'token_verified',
      userId: params.userId,
      workspaceId: params.workspaceId,
      metadata: { rewardIssuanceId: params.rewardIssuanceId },
      severity: 'info',
    }),

  /**
   * Log failed token verification (security event)
   */
  tokenVerificationFailed: (params: { ip?: string; reason: string; token?: string }) =>
    logAuditEvent({
      type: 'token_verification_failed',
      ip: params.ip,
      metadata: {
        reason: params.reason,
        tokenPreview: params.token ? params.token.substring(0, 10) + '...' : undefined,
      },
      severity: 'warning',
    }),

  /**
   * Log shipping address confirmation
   */
  shippingConfirmed: (params: { userId: string; workspaceId: string; rewardIssuanceId: string }) =>
    logAuditEvent({
      type: 'shipping_confirmed',
      userId: params.userId,
      workspaceId: params.workspaceId,
      metadata: { rewardIssuanceId: params.rewardIssuanceId },
      severity: 'info',
    }),

  /**
   * Log rate limit exceeded (security event)
   */
  rateLimitExceeded: (params: { ip?: string; endpoint: string; identifier: string }) =>
    logAuditEvent({
      type: 'rate_limit_exceeded',
      ip: params.ip,
      metadata: {
        endpoint: params.endpoint,
        identifier: params.identifier,
      },
      severity: 'warning',
    }),

  /**
   * Log unauthorized access attempt (security event)
   */
  unauthorizedAccess: (params: {
    userId?: string
    ip?: string
    resource: string
    reason: string
  }) =>
    logAuditEvent({
      type: 'unauthorized_access',
      userId: params.userId,
      ip: params.ip,
      metadata: {
        resource: params.resource,
        reason: params.reason,
      },
      severity: 'error',
    }),
}
