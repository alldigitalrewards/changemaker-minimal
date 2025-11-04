/**
 * RewardSTACK Integration Module
 * Main entry point for ADR Marketplace Platform API integration
 */

export {
  generateRewardStackToken,
  getRewardStackBaseUrl,
  clearTokenCache,
  clearAllTokenCache,
  REWARDSTACK_ENDPOINTS,
} from "./auth";

export {
  createRewardStackClient,
  buildEndpoint,
  RewardStackError,
  RewardStackErrorCode,
  type RewardStackRequestOptions,
} from "./client";

export {
  REWARDSTACK_ENDPOINTS_PATHS,
  type RewardStackParticipant,
  type TransactionRequest,
  type AdjustmentRequest,
  type SsoUrlResponse,
  type WebhookEventType,
  type WebhookPayload,
} from "./types";
