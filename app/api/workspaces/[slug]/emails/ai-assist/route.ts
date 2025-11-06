import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { z } from 'zod';
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth';
import { emailAIConfig, buildPrompt } from '@/lib/ai/email-ai-config';
import { rateLimiter } from '@/lib/ai/rate-limit';
import { costTracker } from '@/lib/ai/cost-tracker';

// Validation schema for AI assist requests
const aiAssistSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
  context: z
    .object({
      templateType: z.string(),
      workspaceName: z.string().optional(),
      brandColor: z.string().optional(),
      existingHtml: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/workspaces/[slug]/emails/ai-assist
 *
 * Generate email template HTML using AI assistance.
 * Requires admin access to the workspace.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Await params to get slug
    const { slug } = await params;

    // Check authentication and workspace access
    const { workspace } = await requireWorkspaceAdmin(slug);

    // Parse and validate request body
    const body = await request.json();
    const validation = aiAssistSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { prompt, context } = validation.data;

    // Check rate limits
    const rateLimitCheck = rateLimiter.checkLimit(workspace.id);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: rateLimitCheck.reason,
        },
        { status: 429 }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'AI service not configured',
          message: 'ANTHROPIC_API_KEY is not set',
        },
        { status: 500 }
      );
    }

    // Build context-aware prompt
    const fullPrompt = buildPrompt({
      prompt,
      templateType: context?.templateType || 'GENERIC',
      workspaceName: context?.workspaceName || workspace.name,
      brandColor: context?.brandColor,
      existingHtml: context?.existingHtml,
    });

    // Call AI to generate template
    const result = streamText({
      model: emailAIConfig.model,
      system: emailAIConfig.systemPrompt,
      prompt: fullPrompt,
      temperature: emailAIConfig.temperature,
      onFinish: ({ usage }) => {
        // Record usage for rate limiting and cost tracking
        const totalTokens = (usage.totalTokens || 0);
        rateLimiter.recordUsage(workspace.id, totalTokens);

        // Estimate input/output split (typically 30/70 for completions)
        const inputTokens = Math.floor(totalTokens * 0.3);
        const outputTokens = Math.floor(totalTokens * 0.7);
        costTracker.recordUsage(workspace.id, inputTokens, outputTokens);
      },
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI assist error:', error);

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate template',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workspaces/[slug]/emails/ai-assist
 *
 * Get AI usage statistics for the workspace.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Await params to get slug
    const { slug } = await params;

    // Check authentication and workspace access
    const { workspace } = await requireWorkspaceAdmin(slug);

    // Get usage statistics
    const usage = costTracker.getUsage(workspace.id, 30);
    const currentUsage = rateLimiter.getUsage(workspace.id);

    return NextResponse.json({
      usage: {
        last30Days: usage,
        currentMinute: currentUsage,
      },
      limits: {
        requestsPerMinute: 10,
        tokensPerMinute: 50000,
      },
    });
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch usage statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
