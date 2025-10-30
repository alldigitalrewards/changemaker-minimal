import { Page, expect } from '@playwright/test'

export const DEFAULT_PASSWORD = 'Changemaker2025!'
export const ADMIN_EMAIL = 'jfelke@alldigitalrewards.com'
export const PARTICIPANT_EMAIL = 'john.doe@acme.com'

export async function loginWithCredentials(page: Page, email: string, password: string = DEFAULT_PASSWORD) {
  await page.goto('/auth/login')

  // Fill in credentials
  await page.fill('#email, input[name="email"]', email)
  await page.fill('#password, input[name="password"]', password)

  // Click submit and wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      // Ignore navigation timeout - cookies are what matter for API tests
    }),
    page.click('button[type="submit"]')
  ])

  // Simple verification: check we're no longer on the login page
  const currentUrl = page.url()
  if (currentUrl.includes('/auth/login')) {
    throw new Error(`Login failed - still on login page. URL: ${currentUrl}`)
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


