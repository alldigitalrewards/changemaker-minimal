import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// Schema for TL;DR and Highlights
const tldrHighlightsSchema = z.object({
  tldr: z.string().describe('A concise 1-2 sentence summary of the announcement'),
  highlights: z.array(z.string()).max(3).describe('Up to 3 key bullet points from the announcement'),
})

// Schema for key dates and actions
const datesActionsSchema = z.object({
  dates: z.array(
    z.object({
      date: z.string().describe('Date mentioned in ISO format if possible, or as mentioned in text'),
      description: z.string().describe('What happens on this date'),
    })
  ).describe('Important dates mentioned in the announcement'),
  actions: z.array(
    z.object({
      action: z.string().describe('Action item for participants'),
      urgent: z.boolean().describe('Whether this action is time-sensitive'),
    })
  ).describe('Action items participants should take'),
})

// Schema for priority suggestion
const prioritySuggestionSchema = z.object({
  suggestedPriority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).describe('Suggested priority based on content analysis'),
  reasoning: z.string().describe('Brief explanation for the suggested priority'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Confidence level in the suggestion'),
})

export interface TldrHighlights {
  tldr: string
  highlights: string[]
}

export interface DateAction {
  dates: Array<{ date: string; description: string }>
  actions: Array<{ action: string; urgent: boolean }>
}

export interface PrioritySuggestion {
  suggestedPriority: 'NORMAL' | 'IMPORTANT' | 'URGENT'
  reasoning: string
  confidence: 'low' | 'medium' | 'high'
}

/**
 * Generate TL;DR and highlights for an announcement
 */
export async function generateTldrHighlights(
  subject: string,
  message: string
): Promise<TldrHighlights | null> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.warn('OpenAI API key not configured - skipping AI enhancement')
    return null
  }

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: tldrHighlightsSchema,
      prompt: `Generate a concise summary and key highlights for this announcement.

Subject: ${subject}
Message: ${message}

Provide:
1. A brief 1-2 sentence TL;DR that captures the essence
2. Up to 3 bullet point highlights of the most important information

Keep it concise and actionable.`,
    })

    return object
  } catch (error) {
    console.error('Failed to generate TL;DR and highlights:', error)
    return null
  }
}

/**
 * Extract key dates and action items from an announcement
 */
export async function extractDatesActions(
  subject: string,
  message: string
): Promise<DateAction | null> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.warn('OpenAI API key not configured - skipping AI enhancement')
    return null
  }

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: datesActionsSchema,
      prompt: `Extract important dates and action items from this announcement.

Subject: ${subject}
Message: ${message}

Identify:
1. Any dates mentioned and what they're for (deadlines, events, etc.)
2. Action items participants should take
3. Whether actions are urgent/time-sensitive

If no dates or actions are found, return empty arrays.`,
    })

    return object
  } catch (error) {
    console.error('Failed to extract dates and actions:', error)
    return null
  }
}

/**
 * Suggest priority level based on announcement content
 */
export async function suggestPriority(
  subject: string,
  message: string
): Promise<PrioritySuggestion | null> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.warn('OpenAI API key not configured - skipping AI enhancement')
    return null
  }

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: prioritySuggestionSchema,
      prompt: `Analyze this announcement and suggest an appropriate priority level.

Subject: ${subject}
Message: ${message}

Consider:
- URGENT: Time-sensitive, requires immediate action, critical deadlines
- IMPORTANT: Significant but not immediately urgent, needs attention soon
- NORMAL: Informational, general updates, no immediate action required

Provide your suggestion with reasoning and confidence level.`,
    })

    return object
  } catch (error) {
    console.error('Failed to suggest priority:', error)
    return null
  }
}
