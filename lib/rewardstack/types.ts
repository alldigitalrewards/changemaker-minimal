/**
 * RewardSTACK API Type Definitions
 * Based on ADR Marketplace Platform API documentation
 */

/**
 * Configuration for RewardSTACK API client
 */
export interface RewardStackConfig {
  apiUrl: string;
  username: string;
  password: string;
  programId: string;
  orgId: string;
}

/**
 * JWT Token response from authentication
 */
export interface TokenResponse {
  token: string;
  expires: number; // Unix timestamp (seconds since epoch) when token expires
}

/**
 * Point adjustment response from API
 */
export interface PointAdjustmentResponse {
  adjustmentId: string;
  amount: number;
  type: 'credit' | 'debit';
  timestamp: string;
  balance?: number;
}

/**
 * API error response structure
 */
export interface RewardStackError {
  error: string;
  message: string;
  statusCode: number;
}

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
  description?: string;
  products: Array<{
    sku: string;
    quantity: number;
  }>;
}

/**
 * Transaction response from catalog reward order
 */
export interface TransactionResponse {
  transactionId: string;
  amount: number;
  timestamp: string;
  products: Array<{
    sku: string;
    quantity: number;
  }>;
}

/**
 * Adjustment request for point rewards
 */
export interface AdjustmentRequest {
  amount: number; // Points to add (positive) or subtract (negative)
  type: 'credit' | 'debit'; // Required by ADR Marketplace API
  description?: string; // Optional description (also accepts "reason")
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
 * Catalog item from RewardSTACK
 */
export interface CatalogItem {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  value: number; // Value in cents
  imageUrl?: string;
  isActive: boolean;
}

/**
 * Catalog response from API
 */
export interface CatalogResponse {
  items: CatalogItem[];
  total: number;
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

  // Catalog
  GET_CATALOG: "/api/program/{programId}/catalog",

  // SSO
  GET_SSO_URL: "/api/program/{programId}/participant/{uniqueId}/sso",

  // Webhooks
  LIST_WEBHOOKS: "/api/organization/{orgId}/webhooks",
  CREATE_WEBHOOK: "/api/organization/{orgId}/webhooks",
  UPDATE_WEBHOOK: "/api/organization/{orgId}/webhooks/{webhookId}",
  DELETE_WEBHOOK: "/api/organization/{orgId}/webhooks/{webhookId}",
} as const;
