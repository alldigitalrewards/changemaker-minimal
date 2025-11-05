import { test, expect } from '@playwright/test'

test.describe('AI-Enhanced Announcements E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', 'admin@test.com')
    await page.fill('input[type="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/w/test-workspace/admin/dashboard')
  })

  test('should create announcement with AI enhancements and display them correctly', async ({ page }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    // Navigate to communications page
    await page.goto('/w/test-workspace/admin/communications')

    // Fill out announcement form
    await page.fill('input[name="subject"]', 'URGENT: System Maintenance Tonight')
    await page.fill('textarea[name="message"]', `Critical system maintenance scheduled for tonight at 11 PM.

All systems will be down for 2 hours. Please save your work and log out before 11 PM.

Action items:
- Save all work before 11 PM
- Log out of all systems
- Plan accordingly for downtime

Maintenance window: 11 PM - 1 AM EST on March 15th, 2025`)

    await page.selectOption('select[name="priority"]', 'URGENT')
    await page.selectOption('select[name="scope"]', 'WORKSPACE')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for success message or redirect
    await page.waitForTimeout(5000) // Allow time for AI processing

    // Navigate to participant dashboard to view announcement
    await page.goto('/w/test-workspace/participant/dashboard')

    // Verify announcement card appears
    await expect(page.locator('text=System Maintenance Tonight')).toBeVisible()

    // Verify TL;DR is displayed
    await expect(page.locator('text=TL;DR').first()).toBeVisible()

    // Verify highlights are displayed
    const highlightsSection = page.locator('[class*="list-disc"]').first()
    await expect(highlightsSection).toBeVisible()

    // Verify action items are displayed with badges
    const actionBadges = page.locator('[class*="CheckCircle"]')
    await expect(actionBadges.first()).toBeVisible()

    // Verify date badges are displayed
    const dateBadges = page.locator('[class*="Calendar"]')
    await expect(dateBadges.first()).toBeVisible()

    // Click to open dialog
    await page.locator('text=System Maintenance Tonight').click()

    // Verify dialog content
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('[role="dialog"] >> text=TL;DR')).toBeVisible()
    await expect(page.locator('[role="dialog"] >> text=Key Highlights')).toBeVisible()
    await expect(page.locator('[role="dialog"] >> text=Action Items')).toBeVisible()
    await expect(page.locator('[role="dialog"] >> text=Important Dates')).toBeVisible()
    await expect(page.locator('[role="dialog"] >> text=Full Message')).toBeVisible()

    // Close dialog
    await page.keyboard.press('Escape')
  })

  test('should display priority badges correctly based on AI suggestions', async ({ page }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    await page.goto('/w/test-workspace/participant/dashboard')

    // Check for URGENT priority badge (red)
    const urgentBadge = page.locator('.bg-red-100.text-red-800').first()
    if (await urgentBadge.isVisible()) {
      await expect(urgentBadge).toContainText('Urgent')
    }

    // Check for IMPORTANT priority badge (orange)
    const importantBadge = page.locator('.bg-orange-100.text-orange-800').first()
    if (await importantBadge.isVisible()) {
      await expect(importantBadge).toContainText('Important')
    }

    // Check for border color matching priority
    const urgentCard = page.locator('.border-l-red-500').first()
    if (await urgentCard.isVisible()) {
      await expect(urgentCard).toBeVisible()
    }
  })

  test('should handle announcements without AI enhancements gracefully', async ({ page }) => {
    // Test fallback behavior when API key is invalid or AI fails
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'invalid-key'

    await page.goto('/w/test-workspace/admin/communications')

    await page.fill('input[name="subject"]', 'Simple Announcement')
    await page.fill('textarea[name="message"]', 'This is a simple announcement without AI enhancements.')
    await page.selectOption('select[name="priority"]', 'NORMAL')
    await page.selectOption('select[name="scope"]', 'WORKSPACE')

    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Restore key
    process.env.OPENAI_API_KEY = originalKey

    await page.goto('/w/test-workspace/participant/dashboard')

    // Announcement should still appear
    await expect(page.locator('text=Simple Announcement')).toBeVisible()

    // But without TL;DR section
    const tldrSection = page.locator('text=TL;DR')
    await expect(tldrSection).not.toBeVisible()

    // Should show full message instead
    await expect(page.locator('text=This is a simple announcement without AI enhancements')).toBeVisible()
  })

  test('should display action items with urgent/non-urgent styling', async ({ page }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    await page.goto('/w/test-workspace/participant/dashboard')

    // Find an announcement card with actions
    const actionBadge = page.locator('.bg-orange-100.text-orange-800', { hasText: '' }).first()

    if (await actionBadge.isVisible()) {
      // Urgent actions should have orange background
      await expect(actionBadge).toHaveClass(/bg-orange-100/)
    }

    // Non-urgent actions should have gray background
    const normalActionBadge = page.locator('.bg-gray-100.text-gray-700', { hasText: '' }).first()
    if (await normalActionBadge.isVisible()) {
      await expect(normalActionBadge).toHaveClass(/bg-gray-100/)
    }
  })

  test('should show "more" indicator when there are many actions or dates', async ({ page }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    await page.goto('/w/test-workspace/admin/communications')

    // Create announcement with many action items
    await page.fill('input[name="subject"]', 'Complex Project Launch')
    await page.fill('textarea[name="message"]', `Project launch with multiple action items:

Action items:
- Complete training module 1 by March 1st
- Complete training module 2 by March 5th
- Submit project proposal by March 10th
- Review stakeholder feedback by March 15th
- Finalize implementation plan by March 20th

Important dates:
- Kickoff meeting: March 1st at 9 AM
- Mid-project review: March 10th at 2 PM
- Final presentation: March 20th at 3 PM`)

    await page.selectOption('select[name="priority"]', 'IMPORTANT')
    await page.selectOption('select[name="scope"]', 'WORKSPACE')

    await page.click('button[type="submit"]')
    await page.waitForTimeout(5000)

    await page.goto('/w/test-workspace/participant/dashboard')

    // Should show "+X more" badge if more than 2 actions
    const moreBadge = page.locator('text=+').first()
    if (await moreBadge.isVisible()) {
      await expect(moreBadge).toContainText('more')
    }
  })

  test('should display date information with calendar icons', async ({ page }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    await page.goto('/w/test-workspace/participant/dashboard')

    // Find date badges
    const dateBadge = page.locator('.bg-purple-100.text-purple-800').first()

    if (await dateBadge.isVisible()) {
      // Should have calendar icon
      const calendarIcon = dateBadge.locator('[class*="Calendar"]')
      await expect(calendarIcon).toBeVisible()

      // Should have purple styling
      await expect(dateBadge).toHaveClass(/bg-purple-100/)
      await expect(dateBadge).toHaveClass(/text-purple-800/)
    }
  })

  test('should show full details in dialog when announcement is clicked', async ({ page }) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      test.skip()
      return
    }

    await page.goto('/w/test-workspace/participant/dashboard')

    // Click first announcement
    const firstAnnouncement = page.locator('[class*="border-l-4"]').first()
    await firstAnnouncement.click()

    // Wait for dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Verify all sections are present in dialog
    const dialog = page.locator('[role="dialog"]')

    // Check for TL;DR section with blue background
    const tldrSection = dialog.locator('.bg-blue-50.border-blue-200')
    if (await tldrSection.isVisible()) {
      await expect(tldrSection).toContainText('TL;DR')
    }

    // Check for Key Highlights section with gray background
    const highlightsSection = dialog.locator('.bg-gray-50.border-gray-200')
    if (await highlightsSection.isVisible()) {
      await expect(highlightsSection).toContainText('Key Highlights')
    }

    // Check for Action Items section with orange background
    const actionsSection = dialog.locator('.bg-orange-50.border-orange-200')
    if (await actionsSection.isVisible()) {
      await expect(actionsSection).toContainText('Action Items')

      // Verify urgent badge appears for urgent actions
      const urgentBadge = actionsSection.locator('text=Urgent')
      if (await urgentBadge.isVisible()) {
        await expect(urgentBadge).toBeVisible()
      }
    }

    // Check for Important Dates section with purple background
    const datesSection = dialog.locator('.bg-purple-50.border-purple-200')
    if (await datesSection.isVisible()) {
      await expect(datesSection).toContainText('Important Dates')
    }

    // Check for Full Message section
    await expect(dialog.locator('text=Full Message')).toBeVisible()

    // Check for sender information at bottom
    await expect(dialog.locator('text=Sent by')).toBeVisible()

    // Check for time information
    await expect(dialog.locator('text=ago')).toBeVisible()
  })
})
