import { NextRequest, NextResponse } from "next/server";
import {
  requireWorkspaceAdmin,
  withErrorHandling,
} from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { clearTokenCache } from "@/lib/rewardstack/auth";

type Params = Promise<{ slug: string }>;

interface UpdateConfigRequest {
  enabled: boolean;
  environment: "QA" | "PRODUCTION";
  orgId?: string;
  programId: string;
  apiKey: string;
  sandboxMode: boolean;
}

/**
 * GET /api/workspaces/[slug]/rewardstack/config
 * Get current RewardSTACK configuration for workspace
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAdmin(slug);

    const config = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      select: {
        rewardStackEnabled: true,
        rewardStackEnvironment: true,
        rewardStackOrgId: true,
        rewardStackProgramId: true,
        rewardStackSandboxMode: true,
        // Note: API key is not returned for security
      },
    });

    return NextResponse.json({
      config: {
        enabled: config?.rewardStackEnabled || false,
        environment: config?.rewardStackEnvironment || null,
        orgId: config?.rewardStackOrgId || null,
        programId: config?.rewardStackProgramId || null,
        sandboxMode: config?.rewardStackSandboxMode || true,
      },
    });
  }
);

/**
 * PUT /api/workspaces/[slug]/rewardstack/config
 * Update RewardSTACK configuration for workspace
 *
 * Requires admin authentication
 * Validates all required fields
 * Stores API key securely (plain text for MVP, encryption in Phase 2)
 * Clears token cache after update
 * Logs configuration change for audit
 */
export const PUT = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    const { slug } = await params;
    const { workspace, user } = await requireWorkspaceAdmin(slug);

    // Parse and validate request body
    const body = (await request.json()) as UpdateConfigRequest;
    const { enabled, environment, orgId, programId, apiKey, sandboxMode } =
      body;

    // Validate required fields
    if (enabled) {
      if (!programId) {
        return NextResponse.json(
          {
            error: "Program ID is required when enabling RewardSTACK",
          },
          { status: 400 }
        );
      }

      if (!apiKey) {
        return NextResponse.json(
          {
            error: "API Key is required when enabling RewardSTACK",
          },
          { status: 400 }
        );
      }

      if (!environment) {
        return NextResponse.json(
          {
            error: "Environment is required when enabling RewardSTACK",
          },
          { status: 400 }
        );
      }

      if (environment !== "QA" && environment !== "PRODUCTION") {
        return NextResponse.json(
          {
            error: "Environment must be 'QA' or 'PRODUCTION'",
          },
          { status: 400 }
        );
      }
    }

    try {
      // Update workspace configuration
      // Note: API key stored as plain text for MVP
      // Phase 2: Implement pgcrypto encryption
      const updated = await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          rewardStackEnabled: enabled,
          rewardStackEnvironment: enabled ? environment : null,
          rewardStackOrgId: enabled && orgId ? orgId : null,
          rewardStackProgramId: enabled ? programId : null,
          rewardStackApiKey: enabled ? apiKey : null,
          rewardStackSandboxMode: enabled ? sandboxMode : true,
        },
        select: {
          id: true,
          rewardStackEnabled: true,
          rewardStackEnvironment: true,
          rewardStackOrgId: true,
          rewardStackProgramId: true,
          rewardStackSandboxMode: true,
        },
      });

      // Clear cached token since configuration changed
      // Use the updated environment from the workspace, fallback to QA
      clearTokenCache(updated.rewardStackEnvironment || "QA");

      // TODO: Log configuration change for audit
      // Note: Need to add WORKSPACE_SETTINGS_UPDATED to ActivityEventType enum
      // await prisma.activityEvent.create({
      //   data: {
      //     type: "WORKSPACE_SETTINGS_UPDATED",
      //     metadata: {
      //       action: "rewardstack_config_update",
      //       enabled,
      //       environment: enabled ? environment : null,
      //       changedBy: user.dbUser.email,
      //       timestamp: new Date().toISOString(),
      //     },
      //     workspaceId: workspace.id,
      //     userId: user.dbUser.id,
      //   },
      // });

      return NextResponse.json({
        success: true,
        message: enabled
          ? "RewardSTACK integration enabled successfully"
          : "RewardSTACK integration disabled successfully",
        config: {
          enabled: updated.rewardStackEnabled,
          environment: updated.rewardStackEnvironment,
          orgId: updated.rewardStackOrgId,
          programId: updated.rewardStackProgramId,
          sandboxMode: updated.rewardStackSandboxMode,
        },
      });
    } catch (error) {
      console.error("Failed to update RewardSTACK configuration:", error);

      return NextResponse.json(
        {
          error: "Failed to update RewardSTACK configuration",
          details:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
        { status: 500 }
      );
    }
  }
);
