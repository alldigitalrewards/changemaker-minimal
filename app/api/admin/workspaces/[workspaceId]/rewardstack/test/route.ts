import { NextRequest, NextResponse } from "next/server";
import { REWARDSTACK_ENDPOINTS } from "@/lib/rewardstack/auth";
import { requirePlatformAdmin, withErrorHandling } from "@/lib/auth/api-auth";

type Params = Promise<{ workspaceId: string }>;

/**
 * POST /api/admin/workspaces/[workspaceId]/rewardstack/test
 * Test connection to RewardSTACK API with provided credentials
 * Platform Admin only - for testing before saving configuration
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Params }) => {
    await requirePlatformAdmin();
    const { workspaceId } = await params;
    const body = await request.json();

    const { programId, orgId, username, password, environment } = body;

    console.log('[RewardSTACK Test] Received body:', {
      programId,
      orgId,
      hasUsername: !!username,
      hasPassword: !!password,
      environment,
    });

    if (!programId || !environment) {
      console.error('[RewardSTACK Test] Missing required fields:', {
        programId: programId || 'MISSING',
        environment: environment || 'MISSING',
      });
      return NextResponse.json(
        {
          error: "Program ID and environment are required",
          details: {
            programId: programId ? 'provided' : 'missing',
            environment: environment ? 'provided' : 'missing'
          }
        },
        { status: 400 }
      );
    }

    const baseUrl = REWARDSTACK_ENDPOINTS[environment as keyof typeof REWARDSTACK_ENDPOINTS];

    // Get JWT token using provided or default credentials
    const authUsername = username || process.env.REWARDSTACK_USERNAME;
    const authPassword = password || process.env.REWARDSTACK_PASSWORD;

    if (!authUsername || !authPassword) {
      return NextResponse.json(
        { error: "RewardSTACK credentials are required" },
        { status: 400 }
      );
    }

    // Obtain JWT token using Basic Auth
    console.log('[RewardSTACK Test] Authenticating with RewardSTACK API:', {
      baseUrl,
      username: authUsername,
    });

    // Create Basic Auth header
    const basicAuth = Buffer.from(`${authUsername}:${authPassword}`).toString('base64');

    const tokenResponse = await fetch(`${baseUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        hoursUntilExpiry: 8760, // 1 year
        tokenName: "Changemaker Platform Test",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[RewardSTACK Test] RewardSTACK API authentication failed:', {
        status: tokenResponse.status,
        error: errorText,
      });
      return NextResponse.json(
        {
          error: "RewardSTACK authentication failed",
          details: `The RewardSTACK API rejected the credentials (HTTP ${tokenResponse.status}). Please verify your username and password are correct for the ${environment} environment.`,
          debugInfo: errorText,
        },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    if (!token) {
      console.error('[RewardSTACK Test] No token in response:', tokenData);
      return NextResponse.json(
        { error: "Failed to obtain authentication token from RewardSTACK" },
        { status: 500 }
      );
    }

    console.log('[RewardSTACK Test] Successfully authenticated with RewardSTACK API');
    console.log('[RewardSTACK Test] Token received (first 50 chars):', token.substring(0, 50) + '...');

    // Decode token to verify scopes
    const tokenParts = token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log('[RewardSTACK Test] Token user:', {
      role: payload.user?.role,
      organization: payload.user?.organization_unique_id,
      hasScopes: Array.isArray(payload.scope),
      scopeCount: payload.scope?.length || 0,
    });

    // Test connection by fetching program details
    const programUrl = `${baseUrl}/api/program/${encodeURIComponent(
      programId
    )}`;

    console.log('[RewardSTACK Test] Fetching program details:', {
      url: programUrl,
      programId,
      hasToken: !!token,
      tokenLength: token.length,
    });

    const response = await fetch(programUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log('[RewardSTACK Test] Program fetch response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    });

    let programData: any = null;
    let programWarning: string | null = null;

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[RewardSTACK Test] Program fetch failed (may not exist yet):', {
        status: response.status,
        error: errorText,
        url: programUrl,
      });

      // Authentication succeeded, but program doesn't exist or isn't accessible
      programWarning = `Program "${programId}" could not be accessed. It may not exist in the ${environment} environment yet, or may need to be created first.`;
    } else {
      programData = await response.json();
    }

    // Fetch additional program data in parallel
    const [catalogResponse, participantsResponse] = await Promise.allSettled([
      fetch(
        `${baseUrl}/api/program/${encodeURIComponent(programId)}/catalog`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      ),
      fetch(
        `${baseUrl}/api/program/${encodeURIComponent(programId)}/participants`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      ),
    ]);

    // Process catalog data
    let catalogItems: any[] = [];
    let catalogCount = 0;
    if (
      catalogResponse.status === "fulfilled" &&
      catalogResponse.value.ok
    ) {
      const catalogData = await catalogResponse.value.json();
      catalogItems = Array.isArray(catalogData) ? catalogData : [];
      catalogCount = catalogItems.length;
    }

    // Process participants data
    let participantCount = 0;
    if (
      participantsResponse.status === "fulfilled" &&
      participantsResponse.value.ok
    ) {
      const participantsData = await participantsResponse.value.json();
      participantCount = Array.isArray(participantsData)
        ? participantsData.length
        : participantsData.total || 0;
    }

    // Get top 5 catalog SKUs sorted by value
    const topSkus = catalogItems
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, 5)
      .map((sku) => ({
        skuId: sku.sku || sku.id,
        name: sku.name || sku.description || "Unknown",
        price: sku.price || 0,
        points: sku.points || Math.round((sku.price || 0) * 100),
      }));

    return NextResponse.json({
      success: true,
      message: `Successfully connected to RewardSTACK program: ${
        programData?.name || programId
      }`,
      program: programData ? {
        name: programData.name || "Unknown Program",
        uniqueId: programData.unique_id,
        url: programData.url,
        active: programData.active === 1,
        published: programData.published === 1,
        organization: programData.organization,
        startDate: programData.start_date,
        endDate: programData.end_date,
        timezone: programData.timezone,
        pointValue: programData.point,
        featuredProducts: programData.featured_products || [],
        productCount: programData.featured_products?.length || 0,
        programTypes: programData.programTypes?.map((t: any) => t.name) || [],
      } : null,
      stats: {
        participantCount,
        catalogCount,
        topSkus,
      },
      warning: programWarning,
    });
  }
);
