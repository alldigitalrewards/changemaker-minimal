/**
 * RewardSTACK Authentication Layer
 * Handles JWT bearer token generation and management for ADR Marketplace Platform API
 *
 * API Documentation: https://admin.adrqa.info/api (QA)
 * Authentication: JWT Bearer Token obtained via POST /token endpoint with Basic Auth
 * Token Expiration: 1 year (8760 hours) - configurable via hoursUntilExpiry
 *
 * Credentials are platform-wide (not workspace-specific) and stored in environment variables:
 * - REWARDSTACK_USERNAME (e.g., admin@alldigitalrewards.com)
 * - REWARDSTACK_PASSWORD
 */

import { prisma } from "../prisma";
import type { TokenResponse } from "./types";

/**
 * RewardSTACK API environment endpoints
 */
export const REWARDSTACK_ENDPOINTS = {
  QA: "https://admin.adrqa.info",
  PRODUCTION: "https://admin.adr.info", // TBD - update when provided
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
 * Key: environment (QA or PRODUCTION)
 * Value: TokenCacheEntry
 *
 * Note: Token is shared across all workspaces for a given environment
 * since authentication is platform-wide, not workspace-specific
 */
const tokenCache = new Map<string, TokenCacheEntry>();

/**
 * Token safety buffer in milliseconds (5 minutes)
 * Refresh tokens 5 minutes before they expire
 */
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

/**
 * Obtain JWT token from RewardSTACK API using username/password
 *
 * @param environment - API environment (QA or PRODUCTION)
 * @returns JWT bearer token
 * @throws Error if credentials missing or authentication fails
 */
async function obtainJwtToken(environment: keyof typeof REWARDSTACK_ENDPOINTS): Promise<TokenCacheEntry> {
  const username = process.env.REWARDSTACK_USERNAME;
  const password = process.env.REWARDSTACK_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "RewardSTACK credentials not configured. Set REWARDSTACK_USERNAME and REWARDSTACK_PASSWORD environment variables."
    );
  }

  const baseUrl = REWARDSTACK_ENDPOINTS[environment];
  const tokenEndpoint = `${baseUrl}/token`;

  try {
    // Create Basic Auth header
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        hoursUntilExpiry: 8760, // 1 year
        tokenName: "Changemaker Platform",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `RewardSTACK authentication failed (${response.status}): ${errorText}`
      );
    }

    const data: TokenResponse = await response.json();

    if (!data.token || !data.expires) {
      throw new Error("Invalid token response from RewardSTACK API");
    }

    // Calculate expiration time with safety buffer
    // expires is a Unix timestamp in seconds, convert to milliseconds and subtract buffer
    const expiresAt = (data.expires * 1000) - TOKEN_REFRESH_BUFFER;

    return {
      token: data.token,
      expiresAt,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to obtain RewardSTACK token: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate JWT bearer token for RewardSTACK API authentication
 *
 * @param workspaceId - Workspace UUID or slug
 * @returns JWT bearer token string
 * @throws Error if workspace not found or RewardSTACK not enabled
 */
export async function generateRewardStackToken(
  workspaceId: string
): Promise<string> {
  // Fetch workspace to determine environment
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      slug: true,
      rewardStackEnabled: true,
      rewardStackEnvironment: true,
    },
  });

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  if (!workspace.rewardStackEnabled) {
    throw new Error(`RewardSTACK not enabled for workspace: ${workspace.slug}`);
  }

  const environment = workspace.rewardStackEnvironment || "QA";

  // Check cache first
  const cacheKey = environment;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // Obtain fresh token
  const tokenEntry = await obtainJwtToken(environment);
  console.log('🔑 Generated fresh RewardSTACK token for', environment, '- expires', new Date(tokenEntry.expiresAt).toLocaleString());

  // Cache token
  tokenCache.set(cacheKey, tokenEntry);

  return tokenEntry.token;
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
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { rewardStackEnvironment: true },
  });

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const environment = workspace.rewardStackEnvironment || "QA";
  return REWARDSTACK_ENDPOINTS[environment];
}

/**
 * Clear cached token for a specific environment
 * Useful for forcing token refresh after configuration changes
 *
 * @param environment - API environment to clear (QA or PRODUCTION)
 */
export function clearTokenCache(environment: keyof typeof REWARDSTACK_ENDPOINTS = "QA"): void {
  tokenCache.delete(environment);
}

/**
 * Clear all cached tokens across all environments
 * Useful for testing or manual cache invalidation
 */
export function clearAllTokenCache(): void {
  tokenCache.clear();
}
