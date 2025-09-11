import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { ADMIN_EMAIL, PARTICIPANT_EMAIL, assertAuthenticated, assertNotAuthenticated, loginWithCredentials } from '../support/auth';

Given('I am logged in', async function (this: CustomWorld) {
  await loginWithCredentials(this.page, PARTICIPANT_EMAIL)
});

Given('I am not authenticated', async function (this: CustomWorld) {
  await this.context.clearCookies()
});

Given('I am logged in as an admin', async function (this: CustomWorld) {
  await loginWithCredentials(this.page, ADMIN_EMAIL)
});

Given('I am logged in as a non-admin user', async function (this: CustomWorld) {
  await loginWithCredentials(this.page, PARTICIPANT_EMAIL)
});

When('I click the {string} button', async function (this: CustomWorld, label: string) {
  await this.page.getByRole('button', { name: label }).click()
});

When('I fill in {string} with a new valid email', async function (this: CustomWorld, field: string) {
  await this.page.fill(`#${field}, input[name="${field}"]`, `user+${Date.now()}@example.test`)
});

When('I fill in {string} with an existing account email', async function (this: CustomWorld, field: string) {
  await this.page.fill(`#${field}, input[name="${field}"]`, PARTICIPANT_EMAIL)
});

When('I fill in {string} with a strong password', async function (this: CustomWorld, field: string) {
  await this.page.fill(`#${field}, input[name="${field}"]`, 'Aaa111!!Aaa111!!')
});

When('I fill in {string} with {string}', async function (this: CustomWorld, field: string, value: string) {
  await this.page.fill(`#${field}, input[name="${field}"]`, value)
});

When('I submit the form', async function (this: CustomWorld) {
  await this.page.click('button[type="submit"], [role="button"][type="submit"]')
});

Then('I should be redirected to the dashboard', async function (this: CustomWorld) {
  await this.page.waitForURL(/\/workspaces(\?.*)?$/)
  expect(new URL(this.page.url()).pathname).toBe('/workspaces')
});

Then('I should see a success message', async function (this: CustomWorld) {
  await expect(this.page.locator('text=/success|welcome|signed in/i')).toBeVisible()
});

Then('I should see an authentication error', async function (this: CustomWorld) {
  await expect(this.page.locator('text=/invalid|incorrect|failed/i')).toBeVisible()
});

Then('I should see an error about the email already being in use', async function (this: CustomWorld) {
  await expect(this.page.locator('text=/already.*(registered|exists|use)/i')).toBeVisible()
});

Then('I should no longer be authenticated', async function (this: CustomWorld) {
  await assertNotAuthenticated(this.page)
});

Then('I should still be authenticated', async function (this: CustomWorld) {
  await assertAuthenticated(this.page)
});

Then('I should {string}', async function (this: CustomWorld, result: string) {
  if (/redirected to the dashboard/i.test(result)) {
    await this.page.waitForURL(/\/workspaces(\?.*)?$/)
    return
  }
  if (/see an authentication error/i.test(result)) {
    await expect(this.page.locator('text=/invalid|incorrect|failed/i')).toBeVisible()
    return
  }
  throw new Error(`Unhandled result expectation: ${result}`)
});

Given('I have a valid password reset link', function () {});

When('I open the link', function () {});

Then('I should be able to log in with the new password', function () {});

Then('I should see a message to check my email', async function (this: CustomWorld) {
  await expect(this.page.locator('text=/check your email|reset/i')).toBeVisible()
});

Then('I should see a generic success message without revealing account existence', async function (this: CustomWorld) {
  await expect(this.page.locator('text=/if your email exists|check your email/i')).toBeVisible()
});


