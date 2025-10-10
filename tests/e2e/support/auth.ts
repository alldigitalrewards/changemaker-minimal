import { Page, expect } from '@playwright/test'

export const DEFAULT_PASSWORD = 'Changemaker2025!'
export const ADMIN_EMAIL = 'jfelke@alldigitalrewards.com'
export const PARTICIPANT_EMAIL = 'john.doe@acme.com'

export async function loginWithCredentials(page: Page, email: string, password: string = DEFAULT_PASSWORD) {
  await page.goto('/auth/login')

  // Fill in credentials
  await page.fill('#email, input[name="email"]', email)
  await page.fill('#password, input[name="password"]', password)

  // Click submit and wait for navigation to complete
  // The login flow redirects to /workspaces via client-side router.push()
  // We need to wait for the navigation to settle, not just the URL change
  await page.click('button[type="submit"]')

  // Wait for successful navigation by checking for workspace-specific content
  // This is more reliable than waiting for URL change with client-side navigation
  try {
    // Option 1: Wait for /workspaces page to load with its content
    await page.waitForURL(/\/workspaces/, { timeout: 10000 })
    // Additionally wait for the page to be interactive
    await page.waitForLoadState('networkidle', { timeout: 5000 })
  } catch (error) {
    // If the URL pattern fails, check if we're redirected elsewhere (like /w/[slug])
    const currentUrl = page.url()
    if (currentUrl.includes('/w/') || currentUrl.includes('/workspaces')) {
      // We're logged in and redirected to a workspace - that's fine
      await page.waitForLoadState('networkidle', { timeout: 5000 })
    } else {
      // We're stuck somewhere unexpected - re-throw the error
      throw error
    }
  }
}

export async function logout(page: Page) {
  await page.request.post('/auth/logout')
  await page.context().clearCookies()
  await page.goto('/')
}

export async function assertAuthenticated(page: Page) {
  await page.goto('/workspaces')
  await expect(new URL(page.url()).pathname).not.toBe('/auth/login')
}

export async function assertNotAuthenticated(page: Page) {
  await page.goto('/workspaces')
  await expect(new URL(page.url()).pathname).toBe('/auth/login')
}


