/**
 * RewardSTACK Authentication Layer
 * Handles JWT bearer token generation and management for ADR Marketplace Platform API
 *
 * API Documentation: https://admin.adrqa.info/api (QA)
 * Authentication: JWT Bearer Token
 */

import { getWorkspaceBySlug } from "../db/queries";

/**
 * RewardSTACK API environment endpoints
 */
export const REWARDSTACK_ENDPOINTS = {
  QA: "https://admin.adrqa.info/api",
  PRODUCTION: "https://admin.adr.info/api", // TBD - update when provided
} as const;

/**
 * Token cache entry
 */
interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

/**
 * In-memory token cache
 * Key: workspaceId
 * Value: TokenCacheEntry
 */
const tokenCache = new Map<string, TokenCacheEntry>();

/**
 * Default token TTL in milliseconds (23 hours)
 * Tokens are refreshed before expiry
 */
const DEFAULT_TOKEN_TTL = 23 * 60 * 60 * 1000;

/**
 * Generate JWT bearer token for RewardSTACK API authentication
 *
 * @param workspaceId - Workspace UUID
 * @returns JWT bearer token string
 * @throws Error if workspace not found or API key missing
 */
export async function generateRewardStackToken(
  workspaceId: string
): Promise<string> {
  // Check cache first
  const cached = tokenCache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // Fetch workspace with RewardSTACK configuration
  const workspace = await getWorkspaceBySlug(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  if (!workspace.rewardStackEnabled) {
    throw new Error(`RewardSTACK not enabled for workspace: ${workspace.slug}`);
  }

  if (!workspace.rewardStackApiKey) {
    throw new Error(
      `RewardSTACK API key not configured for workspace: ${workspace.slug}`
    );
  }

  // For MVP: API key is stored as plain text
  // Phase 2: Decrypt using pgcrypto if encryption is enabled
  const apiKey = workspace.rewardStackApiKey;

  // Generate JWT bearer token
  // Note: RewardSTACK uses API key directly as bearer token
  const token = apiKey;

  // Cache token with TTL
  const expiresAt = Date.now() + DEFAULT_TOKEN_TTL;
  tokenCache.set(workspaceId, { token, expiresAt });

  return token;
}

/**
 * Get RewardSTACK API base URL for workspace
 *
 * @param workspaceId - Workspace UUID
 * @returns API base URL based on environment configuration
 */
export async function getRewardStackBaseUrl(
  workspaceId: string
): Promise<string> {
  const workspace = await getWorkspaceBySlug(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const environment = workspace.rewardStackEnvironment || "QA";
  return REWARDSTACK_ENDPOINTS[environment];
}

/**
 * Clear cached token for workspace
 * Useful for forcing token refresh after configuration changes
 *
 * @param workspaceId - Workspace UUID
 */
export function clearTokenCache(workspaceId: string): void {
  tokenCache.delete(workspaceId);
}

/**
 * Clear all cached tokens
 * Useful for testing or manual cache invalidation
 */
export function clearAllTokenCache(): void {
  tokenCache.clear();
}
