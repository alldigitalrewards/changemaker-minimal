/**
 * Rate Limiter for AI API calls
 *
 * Tracks usage per workspace to prevent abuse and manage costs.
 * Uses in-memory storage suitable for single-instance deployments.
 * For multi-instance setups, consider Redis or a database.
 */

interface RateLimitEntry {
  workspaceId: string;
  requests: number;
  tokens: number;
  windowStart: number;
}

export class AIRateLimit {
  private limits: Map<string, RateLimitEntry>;
  private requestsPerMinute: number;
  private tokensPerMinute: number;

  constructor(requestsPerMinute = 10, tokensPerMinute = 50000) {
    this.limits = new Map();
    this.requestsPerMinute = requestsPerMinute;
    this.tokensPerMinute = tokensPerMinute;
  }

  /**
   * Check if a workspace can make a request
   */
  checkLimit(workspaceId: string): {
    allowed: boolean;
    reason?: string;
  } {
    this.cleanupOldEntries();

    const entry = this.limits.get(workspaceId);
    const now = Date.now();

    if (!entry) {
      return { allowed: true };
    }

    // Check if we're still within the same minute window
    const windowAge = now - entry.windowStart;
    if (windowAge > 60000) {
      // Window expired, allow the request
      return { allowed: true };
    }

    // Check request limit
    if (entry.requests >= this.requestsPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.requestsPerMinute} requests per minute`,
      };
    }

    // Check token limit (estimated - we'll track actual usage after the call)
    if (entry.tokens >= this.tokensPerMinute) {
      return {
        allowed: false,
        reason: `Token limit exceeded: ${this.tokensPerMinute} tokens per minute`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record usage after a successful API call
   */
  recordUsage(workspaceId: string, tokens: number): void {
    const now = Date.now();
    const entry = this.limits.get(workspaceId);

    if (!entry || now - entry.windowStart > 60000) {
      // Start a new window
      this.limits.set(workspaceId, {
        workspaceId,
        requests: 1,
        tokens,
        windowStart: now,
      });
    } else {
      // Update existing window
      entry.requests += 1;
      entry.tokens += tokens;
    }
  }

  /**
   * Clean up entries older than 1 minute
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    for (const [workspaceId, entry] of this.limits.entries()) {
      if (now - entry.windowStart > 60000) {
        entriesToDelete.push(workspaceId);
      }
    }

    for (const workspaceId of entriesToDelete) {
      this.limits.delete(workspaceId);
    }
  }

  /**
   * Get current usage for a workspace
   */
  getUsage(workspaceId: string): {
    requests: number;
    tokens: number;
    windowStart: number | null;
  } {
    const entry = this.limits.get(workspaceId);
    if (!entry) {
      return { requests: 0, tokens: 0, windowStart: null };
    }

    const now = Date.now();
    if (now - entry.windowStart > 60000) {
      return { requests: 0, tokens: 0, windowStart: null };
    }

    return {
      requests: entry.requests,
      tokens: entry.tokens,
      windowStart: entry.windowStart,
    };
  }
}

// Export a singleton instance
export const rateLimiter = new AIRateLimit();
