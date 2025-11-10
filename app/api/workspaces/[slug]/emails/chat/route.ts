import { NextRequest } from 'next/server';
import { streamText, convertToCoreMessages } from 'ai';
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth';
import { emailAIConfig, buildPrompt } from '@/lib/ai/email-ai-config';
import { rateLimiter } from '@/lib/ai/rate-limit';
import { costTracker } from '@/lib/ai/cost-tracker';

// Set max duration for Vercel
export const maxDuration = 60;

interface GenerationSettings {
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'conversational';
  length?: 'concise' | 'standard' | 'detailed';
  creativity?: 'conservative' | 'balanced' | 'creative';
  designElements?: {
    includeCTA?: boolean;
    includeImages?: boolean;
    useTables?: boolean;
  };
}

/**
 * POST /api/workspaces/[slug]/emails/chat
 *
 * Chat endpoint for email template generation using AI SDK's useChat hook.
 * Handles streaming responses with workspace context and generation settings.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Check authentication and workspace access
    const { workspace } = await requireWorkspaceAdmin(slug);

    // Parse request body
    const body = await request.json();

    // Handle both formats:
    // 1. useChat format: { messages, data }
    // 2. Current format: { prompt, conversationHistory, templateType, ... }
    let messages = body.messages;
    let prompt = body.prompt;
    let conversationHistory = body.conversationHistory;

    // Extract context
    const {
      templateType = 'GENERIC',
      workspaceName,
      brandColor,
      generationSettings,
      existingHtml,
      existingSubject,
    } = body.data || body;

    // Build messages array
    if (!messages) {
      messages = [];
    }

    // If we have conversationHistory, start with that
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages = [...conversationHistory];
    }

    // If we have a new prompt, add it to the conversation
    if (prompt && typeof prompt === 'string') {
      messages.push({ role: 'user', content: prompt });
    }

    // Ensure messages is always an array
    if (!Array.isArray(messages)) {
      messages = [];
    }

    // If still no messages, return error
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No messages provided',
          message: 'Either messages, conversationHistory, or prompt must be provided',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check rate limits
    const rateLimitCheck = rateLimiter.checkLimit(workspace.id);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: rateLimitCheck.reason,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'AI service not configured',
          message: 'ANTHROPIC_API_KEY is not set',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Determine temperature based on creativity setting
    const creativityTemperature: Record<string, number> = {
      conservative: 0.3,
      balanced: 0.7,
      creative: 1.0,
    };
    const temperature = generationSettings?.creativity
      ? creativityTemperature[generationSettings.creativity]
      : 0.7;

    // Build enhanced system prompt with full context
    const contextualSystemPrompt = `${emailAIConfig.systemPrompt}

WORKSPACE CONTEXT:
- Name: ${workspaceName || workspace.name}
- Brand Color: ${brandColor || '#F97316'}
- Template Type: ${templateType}

IMPORTANT OUTPUT FORMAT:
When generating or updating email templates, you MUST output the HTML inside a markdown code block like this:

\`\`\`html
<!DOCTYPE html>
<html>
...
</html>
\`\`\`

Always wrap your HTML output in \`\`\`html and \`\`\` markers. This is critical for proper parsing.`;

    // Convert messages to Core Messages format
    const coreMessages = convertToCoreMessages(messages);

    // Enhance the last user message with context if it's a generation request
    if (coreMessages.length > 0) {
      const lastMessage = coreMessages[coreMessages.length - 1];
      if (lastMessage.role === 'user' && typeof lastMessage.content === 'string') {
        // Build context-aware prompt for the user's request
        const enhancedPrompt = buildPrompt({
          prompt: lastMessage.content,
          templateType,
          workspaceName: workspaceName || workspace.name,
          brandColor,
          existingHtml,
          generationSettings,
        });
        lastMessage.content = enhancedPrompt;
      }
    }

    // Stream the AI response
    const result = streamText({
      model: emailAIConfig.model,
      system: contextualSystemPrompt,
      messages: coreMessages,
      temperature,
      onFinish: ({ usage }) => {
        // Record usage for rate limiting
        const totalTokens = usage.totalTokens || 0;
        rateLimiter.recordUsage(workspace.id, totalTokens);

        // Record usage for cost tracking
        const inputTokens = usage.inputTokens || 0;
        const outputTokens = usage.outputTokens || 0;
        costTracker.recordUsage(workspace.id, inputTokens, outputTokens);
      },
    });

    // Return Data Stream Protocol response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
