import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { emailAIConfig, buildPrompt } from '@/lib/ai/email-ai-config'

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
          const result = await streamText({
            model: emailAIConfig.model,
            messages,
            system: emailAIConfig.systemPrompt,
            temperature: emailAIConfig.temperature,
          })

          let accumulatedText = ''
          let extractedSubject = existingSubject
          let extractedHtml = ''

          for await (const chunk of result.textStream) {
            accumulatedText += chunk

            // Try to extract subject and HTML as they stream in
            // Look for subject in various formats
            const subjectMatch = accumulatedText.match(/<title>(.*?)<\/title>/i)
            if (subjectMatch && !extractedSubject) {
              extractedSubject = subjectMatch[1].trim()
            }

            // Extract HTML (everything after DOCTYPE or starting with <html>)
            const htmlMatch = accumulatedText.match(/(<!DOCTYPE[^>]*>[\s\S]*|<html[\s\S]*)/i)
            if (htmlMatch) {
              extractedHtml = htmlMatch[0]
            } else {
              // If no DOCTYPE or <html>, use the whole accumulated text as HTML
              extractedHtml = accumulatedText
            }

            // Send SSE update
            const data = {
              subject: extractedSubject,
              html: extractedHtml,
              done: false,
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            )
          }

          // Send final message
          const finalData = {
            subject: extractedSubject,
            html: extractedHtml,
            done: true,
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`)
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
