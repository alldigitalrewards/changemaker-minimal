import { NextRequest } from 'next/server'
import { streamObject } from 'ai'
import { emailAIConfig, buildPrompt } from '@/lib/ai/email-ai-config'
import { z } from 'zod'

// Note: Using default Node.js runtime instead of Edge to support crypto module
// export const runtime = 'edge'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const {
      prompt,
      conversationHistory = [],
      existingHtml = '',
      existingSubject = '',
      templateType = 'GENERIC',
      workspaceName,
      brandColor = '#F97316',
    } = body

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build context-aware prompt
    const contextPrompt = buildPrompt({
      prompt,
      templateType,
      workspaceName: workspaceName || 'Your Workspace',
      brandColor,
      existingHtml: existingHtml || undefined,
    })

    // Build conversation messages for Claude
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Add conversation history (excluding timestamps)
    conversationHistory.forEach((msg: ConversationMessage) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    })

    // Add current prompt
    messages.push({
      role: 'user',
      content: contextPrompt,
    })

    // Define the output schema
    const emailSchema = z.object({
      subject: z.string().describe('Email subject line'),
      html: z.string().describe('Complete HTML email template with inline CSS'),
    })

    // Create streaming response with structured output
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = streamObject({
            model: emailAIConfig.model,
            schema: emailSchema,
            messages,
            system: emailAIConfig.systemPrompt,
            temperature: emailAIConfig.temperature,
          })

          // Stream the partial object updates
          for await (const partialObject of result.partialObjectStream) {
            // Send incremental updates
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'object-delta',
                subject: partialObject.subject || existingSubject || '',
                html: partialObject.html || existingHtml || '',
                done: false,
              })}\n\n`)
            )
          }

          // Get final complete object
          const finalObject = await result.object

          // Send final message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'finish',
              subject: finalObject.subject,
              html: finalObject.html,
              done: true,
            })}\n\n`)
          )

          controller.close()
        } catch (error) {
          console.error('Error in AI stream:', error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in AI generation:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate email' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
