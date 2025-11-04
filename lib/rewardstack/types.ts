/**
 * RewardSTACK API Type Definitions
 * Based on ADR Marketplace Platform API documentation
 */

/**
 * Participant data structure
 */
export interface RewardStackParticipant {
  uniqueId: string; // Maps to User.id
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

/**
 * Transaction request for catalog rewards
 */
export interface TransactionRequest {
  skuId: string;
  quantity?: number;
  metadata?: Record<string, any>;
}

/**
 * Adjustment request for point rewards
 */
export interface AdjustmentRequest {
  amount: number; // Points to add (positive) or subtract (negative)
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * SSO URL response
 */
export interface SsoUrlResponse {
  ssoUrl: string;
  expiresAt: string; // ISO 8601 timestamp
}

/**
 * Webhook event types
 */
export type WebhookEventType =
  | "participant.created"
  | "participant.updated"
  | "participant.deleted"
  | "transaction.created"
  | "transaction.completed"
  | "transaction.failed"
  | "transaction.returned"
  | "adjustment.created"
  | "adjustment.completed"
  | "adjustment.failed";

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  eventType: WebhookEventType;
  timestamp: string; // ISO 8601
  data: any;
  organizationId: string;
  programId: string;
}

/**
 * API endpoint paths
 */
export const REWARDSTACK_ENDPOINTS_PATHS = {
  // Participant CRUD
  LIST_PARTICIPANTS: "/api/program/{programId}/participant",
  GET_PARTICIPANT: "/api/program/{programId}/participant/{uniqueId}",
  CREATE_PARTICIPANT: "/api/program/{programId}/participant",
  UPDATE_PARTICIPANT: "/api/program/{programId}/participant/{uniqueId}",
  DELETE_PARTICIPANT: "/api/program/{programId}/participant/{uniqueId}",

  // Transactions (catalog rewards)
  CREATE_TRANSACTION:
    "/api/program/{programId}/participant/{uniqueId}/transaction",

  // Adjustments (point rewards)
  CREATE_ADJUSTMENT:
    "/api/program/{programId}/participant/{uniqueId}/adjustment",

  // SSO
  GET_SSO_URL: "/api/program/{programId}/participant/{uniqueId}/sso",

  // Webhooks
  LIST_WEBHOOKS: "/api/organization/{orgId}/webhooks",
  CREATE_WEBHOOK: "/api/organization/{orgId}/webhooks",
  UPDATE_WEBHOOK: "/api/organization/{orgId}/webhooks/{webhookId}",
  DELETE_WEBHOOK: "/api/organization/{orgId}/webhooks/{webhookId}",
} as const;
