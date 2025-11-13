/**
 * Cost Tracker for AI API usage
 *
 * Tracks token usage and calculates costs for AI API calls.
 * Claude 3.5 Sonnet pricing (as of Jan 2025):
 * - Input: $3 per 1M tokens
 * - Output: $15 per 1M tokens
 */

interface UsageEntry {
  workspaceId: string;
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export class CostTracker {
  private entries: UsageEntry[];
  private inputCostPer1M: number;
  private outputCostPer1M: number;

  constructor(inputCostPer1M = 3, outputCostPer1M = 15) {
    this.entries = [];
    this.inputCostPer1M = inputCostPer1M;
    this.outputCostPer1M = outputCostPer1M;
  }

  /**
   * Calculate cost for a given number of tokens
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * this.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * this.outputCostPer1M;
    return inputCost + outputCost;
  }

  /**
   * Record usage for a workspace
   */
  recordUsage(workspaceId: string, inputTokens: number, outputTokens: number): void {
    const cost = this.calculateCost(inputTokens, outputTokens);

    this.entries.push({
      workspaceId,
      timestamp: Date.now(),
      inputTokens,
      outputTokens,
      cost,
    });

    // Cleanup old entries (older than 30 days)
    this.cleanupOldEntries();
  }

  /**
   * Get usage statistics for a workspace
   */
  getUsage(
    workspaceId: string,
    days = 30
  ): {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  } {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const relevantEntries = this.entries.filter(
      (entry) => entry.workspaceId === workspaceId && entry.timestamp >= cutoffTime
    );

    const totalInputTokens = relevantEntries.reduce(
      (sum, entry) => sum + entry.inputTokens,
      0
    );
    const totalOutputTokens = relevantEntries.reduce(
      (sum, entry) => sum + entry.outputTokens,
      0
    );
    const totalCost = relevantEntries.reduce((sum, entry) => sum + entry.cost, 0);

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost,
      requestCount: relevantEntries.length,
    };
  }

  /**
   * Get total usage across all workspaces
   */
  getTotalUsage(
    days = 30
  ): {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    workspaceCount: number;
  } {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const relevantEntries = this.entries.filter(
      (entry) => entry.timestamp >= cutoffTime
    );

    const totalInputTokens = relevantEntries.reduce(
      (sum, entry) => sum + entry.inputTokens,
      0
    );
    const totalOutputTokens = relevantEntries.reduce(
      (sum, entry) => sum + entry.outputTokens,
      0
    );
    const totalCost = relevantEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const uniqueWorkspaces = new Set(relevantEntries.map((entry) => entry.workspaceId));

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost,
      requestCount: relevantEntries.length,
      workspaceCount: uniqueWorkspaces.size,
    };
  }

  /**
   * Clean up entries older than 30 days
   */
  private cleanupOldEntries(): void {
    const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.entries = this.entries.filter((entry) => entry.timestamp >= cutoffTime);
  }

  /**
   * Get recent entries for debugging
   */
  getRecentEntries(limit = 10): UsageEntry[] {
    return this.entries
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}

// Export a singleton instance
export const costTracker = new CostTracker();
