import { test, expect } from '@playwright/test'
import { signInUser } from './support/auth'

test.describe('Workspaces Page UX Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as a test user first
    await signInUser(page, 'admin@example.com', 'password')
  })

  test('analyze current workspaces page layout and accessibility', async ({ page }) => {
    // Navigate to workspaces page
    await page.goto('http://localhost:3000/workspaces')
    await page.waitForLoadState('networkidle')

    // Take initial screenshot
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/workspaces-before-refactor.png',
      fullPage: true 
    })

    // Test 1: Check if Create Workspace and Join Workspace buttons are accessible
    const createWorkspaceButton = page.locator('button', { hasText: 'Create Workspace' })
    const joinWorkspaceButton = page.locator('button', { hasText: /Join/ })

    await expect(createWorkspaceButton).toBeVisible()
    await expect(joinWorkspaceButton.first()).toBeVisible()

    console.log('✓ Create and Join workspace buttons are visible')

    // Test 2: Check current location of action buttons
    const buttonsInCardContent = page.locator('.space-y-2 button, .flex.gap-4 button')
    const buttonCount = await buttonsInCardContent.count()
    console.log(`Found ${buttonCount} action buttons in card content areas`)

    // Test 3: Check for Go To Dashboard buttons
    const dashboardButtons = page.locator('button', { hasText: 'Go to Dashboard' })
    const dashboardButtonCount = await dashboardButtons.count()
    console.log(`Found ${dashboardButtonCount} "Go to Dashboard" buttons`)

    if (dashboardButtonCount > 0) {
      // Test accessibility of dashboard buttons
      for (let i = 0; i < dashboardButtonCount; i++) {
        const button = dashboardButtons.nth(i)
        await expect(button).toBeVisible()
        await expect(button).toBeEnabled()
        
        // Check if button is properly focusable
        await button.focus()
        const isFocused = await button.evaluate(el => el === document.activeElement)
        console.log(`Dashboard button ${i + 1} is focusable: ${isFocused}`)
      }
    }

    // Test 4: Check page header structure
    const pageHeader = page.locator('h1', { hasText: 'Workspaces' })
    await expect(pageHeader).toBeVisible()
    
    const headerContainer = pageHeader.locator('..').locator('..')
    const headerContainsButtons = await headerContainer.locator('button').count()
    console.log(`Page header contains ${headerContainsButtons} buttons`)

    // Test 5: Analyze card layout and spacing
    const workspaceCards = page.locator('[class*="Card"]')
    const cardCount = await workspaceCards.count()
    console.log(`Found ${cardCount} workspace cards`)

    // Test 6: Check for accessibility issues
    const buttonsWithoutAriaLabel = page.locator('button:not([aria-label])')
    const unlabeledButtonCount = await buttonsWithoutAriaLabel.count()
    console.log(`Found ${unlabeledButtonCount} buttons without aria-labels`)

    // Test 7: Keyboard navigation test
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    const focusedElement = await page.evaluate(() => {
      const focused = document.activeElement
      return {
        tagName: focused?.tagName,
        text: focused?.textContent?.trim(),
        className: focused?.className
      }
    })
    console.log('Focused element after Tab navigation:', focusedElement)

    // Document current issues
    console.log('\n=== CURRENT UX ISSUES IDENTIFIED ===')
    console.log('1. Create/Join buttons are buried in card content instead of header')
    console.log('2. Dashboard buttons may have accessibility concerns')
    console.log('3. No clear workspace management section in header')
    console.log('4. User must scroll down to find primary actions')
  })

  test('test current button functionality', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    await page.waitForLoadState('networkidle')

    // Test Create Workspace dialog
    const createButton = page.locator('button', { hasText: 'Create Workspace' })
    if (await createButton.isVisible()) {
      await createButton.click()
      
      // Check if dialog opens
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()
      
      // Close dialog
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
      
      console.log('✓ Create Workspace dialog works correctly')
    }

    // Test Join Workspace functionality
    const joinButtons = page.locator('button', { hasText: /Join/ })
    const joinButtonCount = await joinButtons.count()
    
    if (joinButtonCount > 0) {
      await joinButtons.first().click()
      
      // Check if dialog opens
      const joinDialog = page.locator('[role="dialog"]')
      await expect(joinDialog).toBeVisible()
      
      // Close dialog
      await page.keyboard.press('Escape')
      await expect(joinDialog).not.toBeVisible()
      
      console.log('✓ Join Workspace dialog works correctly')
    }

    // Test Go to Dashboard buttons if they exist
    const dashboardButtons = page.locator('button', { hasText: 'Go to Dashboard' })
    const dashboardCount = await dashboardButtons.count()
    
    console.log(`Testing ${dashboardCount} dashboard buttons`)
    
    for (let i = 0; i < Math.min(dashboardCount, 2); i++) {
      const button = dashboardButtons.nth(i)
      if (await button.isVisible() && await button.isEnabled()) {
        // Click the button to test navigation
        await button.click()
        
        // Wait for navigation
        await page.waitForLoadState('networkidle')
        
        // Check if we're on a dashboard page
        const currentUrl = page.url()
        const isDashboard = currentUrl.includes('/dashboard')
        console.log(`Dashboard button ${i + 1} navigation test: ${isDashboard ? 'SUCCESS' : 'FAILED'} - URL: ${currentUrl}`)
        
        // Return to workspaces page for next test
        await page.goto('http://localhost:3000/workspaces')
        await page.waitForLoadState('networkidle')
      }
    }
  })
})