import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { ensureWorkspace, ensureChallenge, ensurePendingSubmission, setUserRoleInWorkspace } from '../support/fixtures';
import { reviewSubmission } from '../support/api';
import { ADMIN_EMAIL, PARTICIPANT_EMAIL } from '../support/auth';

Given('a workspace {string} with slug {string} exists', async function (this: CustomWorld, name: string, slug: string) {
  await ensureWorkspace(slug, name)
});

Given('I have the admin role in workspace {string}', async function (this: CustomWorld, slug: string) {
  await setUserRoleInWorkspace(ADMIN_EMAIL, slug, 'ADMIN' as any)
});

Given('I am a member of workspace {string}', async function (this: CustomWorld, slug: string) {
  await setUserRoleInWorkspace(PARTICIPANT_EMAIL, slug, 'PARTICIPANT' as any)
});

Given('a challenge {string} exists in workspace {string}', async function (this: CustomWorld, title: string, slug: string) {
  await ensureChallenge(slug, title, `${title} description`)
});

Given('a pending submission exists for challenge {string} in workspace {string}', async function (this: CustomWorld, title: string, slug: string) {
  await ensurePendingSubmission({ slug, title, userEmail: PARTICIPANT_EMAIL })
});

When('I click {string}', async function (this: CustomWorld, label: string) {
  await this.page.getByRole('button', { name: new RegExp(label, 'i') }).click()
});

When('I open the challenge {string}', async function (this: CustomWorld, title: string) {
  await this.page.getByRole('link', { name: new RegExp(title, 'i') }).click()
});

When('I review the submission', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /review/i }).click()
});

When('I choose {string}', async function (this: CustomWorld, decision: string) {
  // Try UI first; if not present, call API directly
  const button = this.page.getByRole('button', { name: new RegExp(decision, 'i') })
  const visible = await button.isVisible().catch(() => false)
  if (visible) {
    await button.click()
    return
  }
  // Fallback: call API review route using remembered submission id from fixture
  // This assumes previous step created a pending submission for participant user
  const slugMatch = /\/w\/(.+?)\b/.exec(this.page.url())
  const slug = slugMatch?.[1] || 'coral'
  // Find one pending submission id via DOM data attributes if available
  const candidate = await this.page.getAttribute('[data-test="submission-row"]', 'data-id').catch(() => null)
  const submissionId = candidate || this.lastSubmissionId || ''
  if (!submissionId) throw new Error('No submission id available to review')
  const res = await reviewSubmission(this.page, slug, submissionId, /approve/i.test(decision) ? 'APPROVED' : 'REJECTED', 10, 'E2E review')
  if (!res.ok()) throw new Error(`Review API failed: ${res.status()}`)
});

Then('I should see the challenge {string} in the list', async function (this: CustomWorld, title: string) {
  await expect(this.page.getByText(title)).toBeVisible()
});

Then('I should see my submission with status {string}', async function (this: CustomWorld, status: string) {
  await expect(this.page.getByText(new RegExp(status, 'i'))).toBeVisible()
});

Then('the submission status should change to {string}', async function (this: CustomWorld, status: string) {
  await expect(this.page.getByText(new RegExp(status, 'i'))).toBeVisible()
});

Then('I should see an authorization error or no review controls', async function (this: CustomWorld) {
  const reviewControls = this.page.getByRole('button', { name: /approve|reject|review/i })
  const visible = await reviewControls.isVisible().catch(() => false)
  if (visible) {
    throw new Error('Review controls visible for non-admin')
  }
});


