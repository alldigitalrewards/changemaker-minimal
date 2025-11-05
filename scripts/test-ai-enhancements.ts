#!/usr/bin/env tsx

/**
 * Test script for AI announcement enhancements
 * Runs the three AI functions and verifies they work correctly
 */

import { generateTldrHighlights, extractDatesActions, suggestPriority } from '../lib/ai/announcement-enhancements'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now()
  try {
    await testFn()
    const duration = Date.now() - startTime
    results.push({ name, passed: true, duration })
    console.log(`✅ ${name} (${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - startTime
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration
    })
    console.error(`❌ ${name} (${duration}ms)`)
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function main() {
  console.log('🚀 Testing AI Announcement Enhancements\n')

  // Check API key
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.error('❌ OPENAI_API_KEY not configured')
    console.error('   Please set OPENAI_API_KEY in .env.local')
    process.exit(1)
  }

  console.log('✅ OPENAI_API_KEY configured\n')

  // Test 1: generateTldrHighlights with standard announcement
  await runTest('generateTldrHighlights - standard announcement', async () => {
    const subject = 'New Office Hours Starting Next Week'
    const message = `We are excited to announce new office hours starting Monday, March 15th.

    The team will be available from 9 AM to 5 PM EST for all your questions and support needs.
    Please book appointments in advance through the portal. Walk-ins are also welcome but may experience wait times.

    This is part of our commitment to better serve our community.`

    const result = await generateTldrHighlights(subject, message)

    if (!result) throw new Error('Result is null')
    if (!result.tldr) throw new Error('TL;DR is missing')
    if (result.tldr.length < 10) throw new Error('TL;DR is too short')
    if (!result.highlights) throw new Error('Highlights are missing')
    if (!Array.isArray(result.highlights)) throw new Error('Highlights is not an array')
    if (result.highlights.length === 0) throw new Error('No highlights generated')
    if (result.highlights.length > 3) throw new Error('Too many highlights')

    console.log(`   TL;DR: "${result.tldr}"`)
    console.log(`   Highlights: ${result.highlights.length} items`)
  })

  // Test 2: generateTldrHighlights with short announcement
  await runTest('generateTldrHighlights - short announcement', async () => {
    const subject = 'Quick Reminder'
    const message = 'Please submit your timesheets by Friday.'

    const result = await generateTldrHighlights(subject, message)

    if (!result) throw new Error('Result is null')
    if (!result.tldr) throw new Error('TL;DR is missing')

    console.log(`   TL;DR: "${result.tldr}"`)
  })

  // Test 3: extractDatesActions with dates and actions
  await runTest('extractDatesActions - with dates and actions', async () => {
    const subject = 'Upcoming Training Session'
    const message = `Please register for our training session on March 20th, 2025 at 2 PM.

    Action items:
    - Complete the pre-training survey by March 18th
    - Download required materials from the portal
    - Submit your questions in advance

    The deadline for registration is March 15th.`

    const result = await extractDatesActions(subject, message)

    if (!result) throw new Error('Result is null')
    if (!result.dates) throw new Error('Dates are missing')
    if (!Array.isArray(result.dates)) throw new Error('Dates is not an array')
    if (!result.actions) throw new Error('Actions are missing')
    if (!Array.isArray(result.actions)) throw new Error('Actions is not an array')

    if (result.dates.length > 0) {
      const firstDate = result.dates[0]
      if (!firstDate.date) throw new Error('Date object missing date field')
      if (!firstDate.description) throw new Error('Date object missing description field')
      console.log(`   Found ${result.dates.length} date(s): ${firstDate.date} - ${firstDate.description}`)
    }

    if (result.actions.length > 0) {
      const firstAction = result.actions[0]
      if (!firstAction.action) throw new Error('Action object missing action field')
      if (typeof firstAction.urgent !== 'boolean') throw new Error('Action object missing urgent boolean field')
      console.log(`   Found ${result.actions.length} action(s): ${firstAction.action} (urgent: ${firstAction.urgent})`)
    }
  })

  // Test 4: extractDatesActions with no dates/actions
  await runTest('extractDatesActions - no dates or actions', async () => {
    const subject = 'General Update'
    const message = 'We are making progress on the project. More updates coming soon.'

    const result = await extractDatesActions(subject, message)

    if (!result) throw new Error('Result is null')
    if (!result.dates) throw new Error('Dates are missing')
    if (!result.actions) throw new Error('Actions are missing')

    console.log(`   Found ${result.dates.length} date(s) and ${result.actions.length} action(s) (expected low/zero)`)
  })

  // Test 5: suggestPriority - URGENT
  await runTest('suggestPriority - URGENT content', async () => {
    const subject = 'URGENT: System Maintenance Tonight'
    const message = `Critical system maintenance scheduled for tonight at 11 PM.
    All systems will be down for 2 hours. Please save your work and log out before 11 PM.
    This is mandatory and cannot be rescheduled.`

    const result = await suggestPriority(subject, message)

    if (!result) throw new Error('Result is null')
    if (!result.suggestedPriority) throw new Error('Suggested priority is missing')
    if (!['NORMAL', 'IMPORTANT', 'URGENT'].includes(result.suggestedPriority)) {
      throw new Error(`Invalid priority: ${result.suggestedPriority}`)
    }
    if (!result.reasoning) throw new Error('Reasoning is missing')
    if (!result.confidence) throw new Error('Confidence is missing')
    if (!['low', 'medium', 'high'].includes(result.confidence)) {
      throw new Error(`Invalid confidence: ${result.confidence}`)
    }

    // For urgent content, expect URGENT or IMPORTANT
    if (!['IMPORTANT', 'URGENT'].includes(result.suggestedPriority)) {
      throw new Error(`Expected URGENT or IMPORTANT, got ${result.suggestedPriority}`)
    }

    console.log(`   Priority: ${result.suggestedPriority} (confidence: ${result.confidence})`)
    console.log(`   Reasoning: "${result.reasoning}"`)
  })

  // Test 6: suggestPriority - NORMAL
  await runTest('suggestPriority - NORMAL content', async () => {
    const subject = 'Newsletter: This Week in Review'
    const message = `Here's a summary of this week's activities:
    - Team lunch on Wednesday was great
    - New blog post published
    - Office plants were watered

    Have a great weekend!`

    const result = await suggestPriority(subject, message)

    if (!result) throw new Error('Result is null')
    if (!result.suggestedPriority) throw new Error('Suggested priority is missing')
    if (!['NORMAL', 'IMPORTANT', 'URGENT'].includes(result.suggestedPriority)) {
      throw new Error(`Invalid priority: ${result.suggestedPriority}`)
    }

    console.log(`   Priority: ${result.suggestedPriority} (confidence: ${result.confidence})`)
  })

  // Test 7: suggestPriority - IMPORTANT
  await runTest('suggestPriority - IMPORTANT content', async () => {
    const subject = 'Policy Update: New Remote Work Guidelines'
    const message = `We have updated our remote work policy effective next month.
    Please review the new guidelines in the employee handbook.
    Managers will discuss changes in upcoming 1-on-1s.`

    const result = await suggestPriority(subject, message)

    if (!result) throw new Error('Result is null')
    if (!result.suggestedPriority) throw new Error('Suggested priority is missing')

    console.log(`   Priority: ${result.suggestedPriority} (confidence: ${result.confidence})`)
  })

  // Test 8: Error handling with invalid API key
  await runTest('Error handling - invalid API key', async () => {
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'invalid-key-should-fail'

    const result = await generateTldrHighlights('Test', 'Test message')

    process.env.OPENAI_API_KEY = originalKey

    // Should return null on error, not throw
    if (result !== null) {
      throw new Error('Expected null result for invalid API key')
    }

    console.log('   Correctly returned null for invalid API key')
  })

  // Test 9: Error handling with missing API key
  await runTest('Error handling - missing API key', async () => {
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'your-openai-api-key-here'

    const result = await generateTldrHighlights('Test', 'Test message')

    process.env.OPENAI_API_KEY = originalKey

    // Should return null when API key is placeholder
    if (result !== null) {
      throw new Error('Expected null result for placeholder API key')
    }

    console.log('   Correctly returned null for placeholder API key')
  })

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('Test Summary')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`\nTotal tests: ${results.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`)

  if (failed > 0) {
    console.log('\n❌ Some tests failed:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}`)
      console.log(`     ${r.error}`)
    })
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
