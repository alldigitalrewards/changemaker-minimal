import { Page, expect } from '@playwright/test'

export const DEFAULT_PASSWORD = 'Changemaker2025!'
export const ADMIN_EMAIL = 'jfelke@alldigitalrewards.com'
export const PARTICIPANT_EMAIL = 'john.doe@acme.com'

export async function loginWithCredentials(page: Page, email: string, password: string = DEFAULT_PASSWORD) {
  await page.goto('/auth/login')
  await page.fill('#email, input[name="email"]', email)
  await page.fill('#password, input[name="password"]', password)
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/workspaces' || url.searchParams.get('redirectTo') !== null),
    page.click('button[type="submit"]')
  ])
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


