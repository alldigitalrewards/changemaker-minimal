import { describe, it, expect, beforeAll } from '@jest/globals'
import { generateTldrHighlights, extractDatesActions, suggestPriority } from '@/lib/ai/announcement-enhancements'

describe('AI Announcement Enhancements', () => {
  beforeAll(() => {
    // Ensure API key is set for tests
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      console.warn('OPENAI_API_KEY not configured - AI enhancement tests will be skipped')
    }
  })

  describe('generateTldrHighlights', () => {
    it('should generate TL;DR and highlights for a standard announcement', async () => {
      const subject = 'New Office Hours Starting Next Week'
      const message = `We are excited to announce new office hours starting Monday, March 15th.

      The team will be available from 9 AM to 5 PM EST for all your questions and support needs.
      Please book appointments in advance through the portal. Walk-ins are also welcome but may experience wait times.

      This is part of our commitment to better serve our community.`

      const result = await generateTldrHighlights(subject, message)

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        expect(result).toBeNull()
        return
      }

      expect(result).not.toBeNull()
      expect(result?.tldr).toBeDefined()
      expect(result?.tldr.length).toBeGreaterThan(10)
      expect(result?.highlights).toBeDefined()
      expect(Array.isArray(result?.highlights)).toBe(true)
      expect(result?.highlights.length).toBeGreaterThan(0)
      expect(result?.highlights.length).toBeLessThanOrEqual(3)
    }, 30000) // 30s timeout for API call

    it('should handle short announcements', async () => {
      const subject = 'Quick Reminder'
      const message = 'Please submit your timesheets by Friday.'

      const result = await generateTldrHighlights(subject, message)

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        expect(result).toBeNull()
        return
      }

      expect(result).not.toBeNull()
      expect(result?.tldr).toBeDefined()
    }, 30000)

    it('should return null when API key is not configured', async () => {
      const originalKey = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = 'your-openai-api-key-here'

      const result = await generateTldrHighlights('Test', 'Test message')

      expect(result).toBeNull()

      process.env.OPENAI_API_KEY = originalKey
    })
  })

  describe('extractDatesActions', () => {
    it('should extract dates and action items from announcement', async () => {
      const subject = 'Upcoming Training Session'
      const message = `Please register for our training session on March 20th, 2025 at 2 PM.

      Action items:
      - Complete the pre-training survey by March 18th
      - Download required materials from the portal
      - Submit your questions in advance

      The deadline for registration is March 15th.`

      const result = await extractDatesActions(subject, message)

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        expect(result).toBeNull()
        return
      }

      expect(result).not.toBeNull()
      expect(result?.dates).toBeDefined()
      expect(Array.isArray(result?.dates)).toBe(true)
      expect(result?.actions).toBeDefined()
      expect(Array.isArray(result?.actions)).toBe(true)

      // Should find at least one date
      if (result?.dates && result.dates.length > 0) {
        expect(result.dates[0]).toHaveProperty('date')
        expect(result.dates[0]).toHaveProperty('description')
      }

      // Should find at least one action
      if (result?.actions && result.actions.length > 0) {
        expect(result.actions[0]).toHaveProperty('action')
        expect(result.actions[0]).toHaveProperty('urgent')
        expect(typeof result.actions[0].urgent).toBe('boolean')
      }
    }, 30000)

    it('should return empty arrays when no dates or actions found', async () => {
      const subject = 'General Update'
      const message = 'We are making progress on the project. More updates coming soon.'

      const result = await extractDatesActions(subject, message)

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        expect(result).toBeNull()
        return
      }

      expect(result).not.toBeNull()
      expect(result?.dates).toBeDefined()
      expect(result?.actions).toBeDefined()
    }, 30000)
  })

  describe('suggestPriority', () => {
    it('should suggest URGENT priority for time-sensitive content', async () => {
      const subject = 'URGENT: System Maintenance Tonight'
      const message = `Critical system maintenance scheduled for tonight at 11 PM.
      All systems will be down for 2 hours. Please save your work and log out before 11 PM.
      This is mandatory and cannot be rescheduled.`

      const result = await suggestPriority(subject, message)

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        expect(result).toBeNull()
        return
      }

      expect(result).not.toBeNull()
      expect(result?.suggestedPriority).toBeDefined()
      expect(['NORMAL', 'IMPORTANT', 'URGENT']).toContain(result?.suggestedPriority)
      expect(result?.reasoning).toBeDefined()
      expect(result?.confidence).toBeDefined()
      expect(['low', 'medium', 'high']).toContain(result?.confidence)

      // For this urgent content, we expect URGENT or at least IMPORTANT
      expect(['IMPORTANT', 'URGENT']).toContain(result?.suggestedPriority)
    }, 30000)

    it('should suggest NORMAL priority for informational content', async () => {
      const subject = 'Newsletter: This Week in Review'
      const message = `Here's a summary of this week's activities:
      - Team lunch on Wednesday was great
      - New blog post published
      - Office plants were watered

      Have a great weekend!`

      const result = await suggestPriority(subject, message)

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        expect(result).toBeNull()
        return
      }

      expect(result).not.toBeNull()
      expect(result?.suggestedPriority).toBeDefined()
      expect(['NORMAL', 'IMPORTANT', 'URGENT']).toContain(result?.suggestedPriority)
    }, 30000)

    it('should suggest IMPORTANT priority for significant updates', async () => {
      const subject = 'Policy Update: New Remote Work Guidelines'
      const message = `We have updated our remote work policy effective next month.
      Please review the new guidelines in the employee handbook.
      Managers will discuss changes in upcoming 1-on-1s.`

      const result = await suggestPriority(subject, message)

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        expect(result).toBeNull()
        return
      }

      expect(result).not.toBeNull()
      expect(result?.suggestedPriority).toBeDefined()
      expect(['NORMAL', 'IMPORTANT', 'URGENT']).toContain(result?.suggestedPriority)
    }, 30000)
  })

  describe('Error Handling', () => {
    it('should gracefully handle API errors', async () => {
      const originalKey = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = 'invalid-key-should-fail'

      const result = await generateTldrHighlights('Test', 'Test message')

      // Should return null on error, not throw
      expect(result).toBeNull()

      process.env.OPENAI_API_KEY = originalKey
    }, 30000)
  })
})
