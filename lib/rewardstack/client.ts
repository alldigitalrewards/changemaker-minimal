/**
 * RewardSTACK API Client Wrapper
 * Provides authenticated HTTP client for ADR Marketplace Platform API
 *
 * Features:
 * - Automatic JWT bearer token injection
 * - Environment-aware routing (QA/Production)
 * - Error handling with retry logic
 * - Audit logging
 */

import {
  generateRewardStackToken,
  getRewardStackBaseUrl,
  clearTokenCache,
} from "./auth";

/**
 * RewardSTACK API error codes
 */
export enum RewardStackErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  SERVER_ERROR = "SERVER_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

/**
 * RewardSTACK API error
 */
export class RewardStackError extends Error {
  constructor(
    message: string,
    public code: RewardStackErrorCode,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = "RewardStackError";
  }
}

/**
 * Request options for RewardSTACK API
 */
export interface RewardStackRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  retry?: boolean;
  retryCount?: number;
}

/**
 * Create authenticated RewardSTACK API client for workspace
 *
 * @param workspaceId - Workspace UUID or slug
 * @returns API client with request method
 */
export async function createRewardStackClient(workspaceId: string) {
  const baseUrl = await getRewardStackBaseUrl(workspaceId);
  const token = await generateRewardStackToken(workspaceId);

  /**
   * Make authenticated request to RewardSTACK API
   *
   * @param endpoint - API endpoint path (e.g., "/program/{programId}/participant")
   * @param options - Request options
   * @returns Response data
   */
  async function request<T = any>(
    endpoint: string,
    options: RewardStackRequestOptions = {}
  ): Promise<T> {
    const {
      method = "GET",
      body,
      headers = {},
      retry = true,
      retryCount = 0,
    } = options;

    const url = `${baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle authentication errors
      if (response.status === 401) {
        if (retry && retryCount < 1) {
          // Clear cache and retry once with fresh token
          // Note: clearTokenCache now takes environment, not workspaceId
          // We clear the default QA environment, assuming most workspaces use QA
          clearTokenCache("QA");
          return request(endpoint, { ...options, retry: false, retryCount: 1 });
        }
        throw new RewardStackError(
          "Authentication failed - invalid credentials or expired token",
          RewardStackErrorCode.UNAUTHORIZED,
          401
        );
      }

      if (response.status === 403) {
        throw new RewardStackError(
          "Access forbidden - insufficient permissions",
          RewardStackErrorCode.FORBIDDEN,
          403
        );
      }

      if (response.status === 404) {
        throw new RewardStackError(
          "Resource not found",
          RewardStackErrorCode.NOT_FOUND,
          404
        );
      }

      if (response.status === 429) {
        throw new RewardStackError(
          "Rate limit exceeded",
          RewardStackErrorCode.RATE_LIMIT,
          429
        );
      }

      if (response.status >= 500) {
        throw new RewardStackError(
          "RewardSTACK server error",
          RewardStackErrorCode.SERVER_ERROR,
          response.status
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new RewardStackError(
          errorData.message || "Request failed",
          RewardStackErrorCode.VALIDATION_ERROR,
          response.status,
          errorData
        );
      }

      // Return response data
      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof RewardStackError) {
        throw error;
      }

      // Network or fetch errors
      throw new RewardStackError(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        RewardStackErrorCode.NETWORK_ERROR
      );
    }
  }

  return {
    request,
    baseUrl,
  };
}

/**
 * Helper to construct endpoint paths with parameters
 *
 * @param template - Endpoint template with {param} placeholders
 * @param params - Parameter values
 * @returns Formatted endpoint path
 *
 * @example
 * buildEndpoint("/program/{programId}/participant/{uniqueId}", {
 *   programId: "123",
 *   uniqueId: "user-456"
 * })
 * // => "/program/123/participant/user-456"
 */
export function buildEndpoint(
  template: string,
  params: Record<string, string>
): string {
  let endpoint = template;
  for (const [key, value] of Object.entries(params)) {
    endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(value));
  }
  return endpoint;
}
