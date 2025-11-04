import { NextRequest, NextResponse } from "next/server";
import {
  requireWorkspaceAdmin,
  withErrorHandling,
} from "@/lib/auth/api-auth";
import { REWARDSTACK_ENDPOINTS } from "@/lib/rewardstack/auth";

type Params = Promise<{ slug: string }>;

interface TestConnectionRequest {
  programId: string;
  apiKey: string;
  environment: "QA" | "PRODUCTION";
}

/**
 * POST /api/workspaces/[slug]/rewardstack/test-connection
 * Test RewardSTACK credentials and program connectivity
 *
 * Does NOT persist credentials - only validates connectivity
 * Requires admin authentication
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;

    // Require admin access
    const { workspace } = await requireWorkspaceAdmin(slug);

    // Parse request body
    const body = (await request.json()) as TestConnectionRequest;
    const { programId, apiKey, environment } = body;

    // Validate required fields
    if (!programId || !apiKey || !environment) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: "programId, apiKey, and environment are required",
        },
        { status: 400 }
      );
    }

    // Validate environment
    if (environment !== "QA" && environment !== "PRODUCTION") {
      return NextResponse.json(
        {
          error: "Invalid environment",
          details: "environment must be 'QA' or 'PRODUCTION'",
        },
        { status: 400 }
      );
    }

    try {
      // Get base URL for environment
      const baseUrl = REWARDSTACK_ENDPOINTS[environment];

      // Test connection by calling the programs endpoint
      // Note: RewardSTACK uses API key directly as bearer token
      const testUrl = `${baseUrl}/api/2.0/programs/${encodeURIComponent(programId)}`;

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      // Handle different response statuses
      if (response.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication failed",
            details: "Invalid API key or credentials",
          },
          { status: 200 } // Return 200 so client can handle gracefully
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          {
            success: false,
            error: "Access forbidden",
            details: "API key does not have access to this program",
          },
          { status: 200 }
        );
      }

      if (response.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Program not found",
            details: `Program ID '${programId}' does not exist`,
          },
          { status: 200 }
        );
      }

      if (response.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            details: "Too many requests. Please try again later.",
          },
          { status: 200 }
        );
      }

      if (response.status >= 500) {
        return NextResponse.json(
          {
            success: false,
            error: "RewardSTACK server error",
            details: "The RewardSTACK API is experiencing issues",
          },
          { status: 200 }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          {
            success: false,
            error: "Connection test failed",
            details: errorData.message || `HTTP ${response.status}`,
          },
          { status: 200 }
        );
      }

      // Success - connection verified
      const programData = await response.json();

      return NextResponse.json({
        success: true,
        message: "Connection successful",
        program: {
          id: programData.id || programId,
          name: programData.name || "Unknown Program",
          // Include any other relevant program details
        },
      });
    } catch (error) {
      console.error("RewardSTACK connection test error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Network error",
          details:
            error instanceof Error
              ? error.message
              : "Failed to connect to RewardSTACK API",
        },
        { status: 200 }
      );
    }
  }
);
