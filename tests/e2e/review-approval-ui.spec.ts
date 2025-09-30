import { test, expect } from '@playwright/test'
import { ADMIN_EMAIL, DEFAULT_PASSWORD, loginWithCredentials } from './support/auth'
import { ensurePendingSubmission } from './support/fixtures'

test('Admin can approve with reward selection via UI', async ({ page }) => {
  const slug = 'ui-approve-reward'
  const participant = 'participant+ui@test.com'
  const { submission, challenge } = await ensurePendingSubmission({ slug, title: 'UI Approve', userEmail: participant })

  await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD)
  await page.goto(`/w/${slug}/admin/challenges/${challenge.id}?tab=submissions&submissions=pending`)

  // Open approve dialog
  await page.getByRole('button', { name: 'Approve' }).first().click()
  // Select reward type and set amount
  await page.getByText('Reward Type').first()
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Points' }).click()
  await page.getByPlaceholder(String(10)).fill('15')
  await page.getByRole('button', { name: 'Approve & Award' }).click()

  await expect(page.getByText('Submission approved!')).toBeVisible()
})


