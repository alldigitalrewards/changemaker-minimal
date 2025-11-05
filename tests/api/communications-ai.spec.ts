import { test, expect } from '@playwright/test'
import { prisma } from '@/lib/prisma'

test.describe('Communications API - AI Enhancements', () => {
  let workspaceSlug: string
  let adminAuthToken: string
  let participantAuthToken: string

  test.beforeAll(async () => {
    // Use existing workspace from seeded database
    const workspace = await prisma.workspace.findFirst({
      where: { slug: 'alldigitalrewards' }
    })

    if (!workspace) {
      throw new Error('Workspace "alldigitalrewards" not found. Database may not be seeded.')
    }

    workspaceSlug = workspace.slug

    // Get admin user for the workspace
    const adminUser = await prisma.user.findFirst({
      where: {
        workspaceMemberships: {
          some: {
            workspaceId: workspace.id,
            role: 'ADMIN'
          }
        }
      }
    })

    const participantUser = await prisma.user.findFirst({
      where: {
        workspaceMemberships: {
          some: {
            workspaceId: workspace.id,
            role: 'PARTICIPANT'
          }
        }
      }
    })

    if (!adminUser) {
      throw new Error('Admin user not found for workspace. Database may not be seeded properly.')
    }

    if (!participantUser) {
      throw new Error('Participant user not found for workspace. Database may not be seeded properly.')
    }

    // For Supabase auth, we'd get real tokens here
    // For this test, we'll use the user IDs as mock tokens
    adminAuthToken = adminUser.id
    participantAuthToken = participantUser.id
  })

  test('should generate AI enhancements when creating announcement with valid API key', async ({ request }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    const response = await request.post(`/api/workspaces/${workspaceSlug}/communications`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      data: {
        subject: 'URGENT: System Maintenance Tonight',
        message: `Critical system maintenance scheduled for tonight at 11 PM.

        All systems will be down for 2 hours. Please save your work and log out before 11 PM.

        Action items:
        - Save all work before 11 PM
        - Log out of all systems
        - Plan accordingly for downtime

        Maintenance window: 11 PM - 1 AM EST`,
        scope: 'WORKSPACE',
        audience: 'ALL',
        priority: 'URGENT'
      }
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    expect(data.communication).toBeDefined()
    expect(data.communication.id).toBeDefined()

    // Verify AI enhancements were generated
    expect(data.communication.tldr).toBeDefined()
    expect(data.communication.tldr).not.toBeNull()
    expect(typeof data.communication.tldr).toBe('string')
    expect(data.communication.tldr.length).toBeGreaterThan(10)

    expect(data.communication.highlights).toBeDefined()
    expect(Array.isArray(data.communication.highlights)).toBe(true)
    expect(data.communication.highlights.length).toBeGreaterThan(0)
    expect(data.communication.highlights.length).toBeLessThanOrEqual(3)

    expect(data.communication.aiDates).toBeDefined()
    expect(Array.isArray(data.communication.aiDates)).toBe(true)

    expect(data.communication.aiActions).toBeDefined()
    expect(Array.isArray(data.communication.aiActions)).toBe(true)

    expect(data.communication.aiPrioritySuggestion).toBeDefined()

    // Clean up
    await prisma.communication.delete({
      where: { id: data.communication.id }
    })
  })

  test('should handle AI enhancements for different priority levels', async ({ request }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    const testCases = [
      {
        priority: 'NORMAL',
        subject: 'Weekly Newsletter',
        message: 'Here are this week\'s updates and highlights from the team.'
      },
      {
        priority: 'IMPORTANT',
        subject: 'Policy Update',
        message: 'We have updated our remote work policy. Please review the new guidelines in the employee handbook.'
      }
    ]

    for (const testCase of testCases) {
      const response = await request.post(`/api/workspaces/${workspaceSlug}/communications`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminAuthToken}`
        },
        data: {
          subject: testCase.subject,
          message: testCase.message,
          scope: 'WORKSPACE',
          audience: 'ALL',
          priority: testCase.priority
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      expect(data.communication.tldr).toBeDefined()
      expect(data.communication.highlights).toBeDefined()
      expect(data.communication.priority).toBe(testCase.priority)

      // Clean up
      await prisma.communication.delete({
        where: { id: data.communication.id }
      })
    }
  })

  test('should process AI enhancements in parallel (performance check)', async ({ request }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    const startTime = Date.now()

    const response = await request.post(`/api/workspaces/${workspaceSlug}/communications`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      data: {
        subject: 'Performance Test Announcement',
        message: 'This is a test announcement to verify parallel AI processing performance.',
        scope: 'WORKSPACE',
        audience: 'ALL',
        priority: 'NORMAL'
      }
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    // Parallel processing should complete in under 15 seconds
    // (3 AI calls in parallel, each ~3-5 seconds)
    expect(duration).toBeLessThan(15000)

    // Verify all enhancements were generated
    expect(data.communication.tldr).toBeDefined()
    expect(data.communication.highlights).toBeDefined()
    expect(data.communication.aiPrioritySuggestion).toBeDefined()

    // Clean up
    await prisma.communication.delete({
      where: { id: data.communication.id }
    })
  })

  test('should gracefully handle AI enhancement failures without blocking announcement creation', async ({ request }) => {
    // Temporarily set invalid API key
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'invalid-key-for-testing'

    const response = await request.post(`/api/workspaces/${workspaceSlug}/communications`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      data: {
        subject: 'Fallback Test',
        message: 'This announcement should be created even if AI enhancements fail.',
        scope: 'WORKSPACE',
        audience: 'ALL',
        priority: 'NORMAL'
      }
    })

    // Restore original key
    process.env.OPENAI_API_KEY = originalKey

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    // Communication should still be created
    expect(data.communication).toBeDefined()
    expect(data.communication.id).toBeDefined()
    expect(data.communication.subject).toBe('Fallback Test')

    // AI enhancements should be null/empty due to failure
    expect(data.communication.tldr).toBeNull()
    expect(data.communication.highlights).toBeNull()

    // Clean up
    await prisma.communication.delete({
      where: { id: data.communication.id }
    })
  })

  test('should store AI enhancements correctly in database', async ({ request }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    const response = await request.post(`/api/workspaces/${workspaceSlug}/communications`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      data: {
        subject: 'Database Storage Test',
        message: 'Testing that AI enhancements are properly stored in the database with correct types.',
        scope: 'WORKSPACE',
        audience: 'ALL',
        priority: 'NORMAL'
      }
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    // Fetch from database directly to verify storage
    const dbCommunication = await prisma.communication.findUnique({
      where: { id: data.communication.id }
    })

    expect(dbCommunication).toBeDefined()
    expect(dbCommunication?.tldr).toBeDefined()
    expect(typeof dbCommunication?.tldr).toBe('string')

    // highlights should be stored as JSON array
    expect(dbCommunication?.highlights).toBeDefined()
    expect(Array.isArray(dbCommunication?.highlights)).toBe(true)

    // aiDates should be stored as JSON array
    expect(dbCommunication?.aiDates).toBeDefined()
    expect(Array.isArray(dbCommunication?.aiDates)).toBe(true)

    // aiActions should be stored as JSON array
    expect(dbCommunication?.aiActions).toBeDefined()
    expect(Array.isArray(dbCommunication?.aiActions)).toBe(true)

    // aiPrioritySuggestion should be stored as JSON string
    expect(dbCommunication?.aiPrioritySuggestion).toBeDefined()

    // Clean up
    await prisma.communication.delete({
      where: { id: data.communication.id }
    })
  })
})
