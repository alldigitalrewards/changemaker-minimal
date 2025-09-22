import { test, expect } from '@playwright/test'

// NOTE: These tests assume a seeded workspace and an admin account available via environment/config.
// They exercise the invite creation and acceptance happy path with minimal stubs for email delivery.

test.describe('Invite Flow', () => {
  test('admin creates invite and participant accepts via signup/onboarding', async ({ page, request, context }) => {
    // Admin logs in (helper assumed in support/auth.ts if available)
    // For brevity, we navigate directly to participants page and invoke UI/API as needed

    // 1) Create an invite via API as admin (replace slug and auth cookie per your test helpers)
    const slug = 'demo-workspace'
    const newEmail = `invitee+${Date.now()}@example.com`

    // Create invite via API
    const res = await request.post(`/api/workspaces/${slug}/participants`, {
      data: { email: newEmail, role: 'PARTICIPANT' }
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json?.invite?.code).toBeTruthy()

    const inviteCode = json.invite.code as string

    // 2) Visit invite landing page unauthenticated and accept -> should route to signup
    await page.goto(`/invite/${inviteCode}`)
    await page.getByRole('button', { name: 'Accept Invitation' }).click()

    await page.waitForURL(/\/auth\/signup\?/) // redirected to signup

    // Simulate signup completion by navigating back to invite (in real test, fill form)
    await page.goto(`/invite/${inviteCode}`)
    await page.getByRole('button', { name: 'Accept Invitation' }).click()

    // On first accept, should show success and then redirect to onboarding or dashboard
    await expect(page.getByText('Welcome!')).toBeVisible()

    // Redirect either to onboarding or dashboard depending on profileComplete; allow either
    await page.waitForURL(/\/onboarding\?next=|\/w\/.*\/(admin|participant)\/dashboard/)

    // 3) Idempotent accept
    await page.goto(`/invite/${inviteCode}`)
    await page.getByRole('button', { name: 'Accept Invitation' }).click()
    await page.waitForResponse(/\/api\/invites\/accept/)
    await expect(page.getByText('already a member')).toBeVisible()
  })

  test('email mismatch blocks acceptance', async ({ page, request }) => {
    const slug = 'demo-workspace'
    const invitedEmail = `invited+${Date.now()}@example.com`

    // Create invite bound to invitedEmail
    const res = await request.post(`/api/workspaces/${slug}/participants`, {
      data: { email: invitedEmail, role: 'PARTICIPANT' }
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    const inviteCode = json.invite.code as string

    // Assume current signed-in user is a different account (test harness should sign them in beforehand)
    await page.goto(`/invite/${inviteCode}`)
    await page.getByRole('button', { name: 'Accept Invitation' }).click()

    // Expect a 403 with code INVITE_EMAIL_MISMATCH (surface via toast)
    // We assert by waiting for the accept request and checking response status
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/invites/accept')),
    ])
    expect(resp.status()).toBe(403)
  })
})

