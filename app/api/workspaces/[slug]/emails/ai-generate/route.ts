import { NextRequest } from 'next/server'
import { streamText, tool } from 'ai'
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

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = streamText({
            model: emailAIConfig.model,
            messages,
            system: emailAIConfig.systemPrompt,
            temperature: emailAIConfig.temperature,
            tools: {
              saveTemplate: tool({
                description: 'Save the current email template. Use this when the user asks to save, wants to save the template, or says "save this template", "save it", "please save", etc.',
                parameters: z.object({
                  reason: z.string().optional().describe('Optional note about why the template is being saved'),
                }),
                execute: async ({ reason }) => {
                  // This is a client-side action, so we just return a signal
                  return { action: 'save', reason }
                },
              }),
            },
          })

          let accumulatedText = ''
          let extractedSubject = existingSubject
          let extractedHtml = ''

          // Listen to the full stream to handle both text and tool calls
          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              accumulatedText += part.textDelta

              // Try to extract subject and HTML as they stream in
              const subjectMatch = accumulatedText.match(/<title>(.*?)<\/title>/i)
              if (subjectMatch && !extractedSubject) {
                extractedSubject = subjectMatch[1].trim()
              }

              // Extract HTML (everything after DOCTYPE or starting with <html>)
              const htmlMatch = accumulatedText.match(/(<!DOCTYPE[^>]*>[\s\S]*|<html[\s\S]*)/i)
              if (htmlMatch) {
                extractedHtml = htmlMatch[0]
              } else {
                extractedHtml = accumulatedText
              }

              // Send SSE update
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'text-delta',
                  subject: extractedSubject,
                  html: extractedHtml,
                  done: false,
                })}\n\n`)
              )
            } else if (part.type === 'tool-call') {
              // Send tool call to client
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'tool-call',
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.args,
                })}\n\n`)
              )
            } else if (part.type === 'tool-result') {
              // Send tool result to client (optional, for debugging)
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'tool-result',
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  result: part.result,
                })}\n\n`)
              )
            }
          }

          // Send final message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'finish',
              subject: extractedSubject,
              html: extractedHtml,
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
