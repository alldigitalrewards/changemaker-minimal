import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { ensureWorkspace, setUserRoleInWorkspace } from '../support/fixtures';
import { PARTICIPANT_EMAIL } from '../support/auth';

Given('a workspace {string} with slug {string} exists and I am a member', async function (this: CustomWorld, name: string, slug: string) {
  await ensureWorkspace(slug, name)
  await setUserRoleInWorkspace(PARTICIPANT_EMAIL, slug, 'PARTICIPANT' as any)
});

Given('a workspace with slug {string} exists and I am not a member', async function (this: CustomWorld, slug: string) {
  await ensureWorkspace(slug, slug)
});

When('I open the {string} dialog', async function (this: CustomWorld, dialog: string) {
  await this.page.getByRole('button', { name: new RegExp(dialog, 'i') }).click()
});

When('I submit the dialog', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /create|join|submit/i }).click()
});

Then('I should see {string} in my workspace list', async function (this: CustomWorld, workspaceName: string) {
  await expect(this.page.getByText(workspaceName)).toBeVisible()
});

Then('I should be able to open {string}', async function (this: CustomWorld, path: string) {
  await this.page.goto(path)
  await expect(this.page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
});

Then('I should see the workspace dashboard', async function (this: CustomWorld) {
  await expect(this.page.locator('main')).toBeVisible()
});

Then('I should see a not-found or access denied message', async function (this: CustomWorld) {
  await expect(this.page.locator('text=/not found|access denied|unauthorized/i')).toBeVisible()
});

When('I fill in {string} with a valid code', async function (this: CustomWorld, field: string) {
  await this.page.fill(`#${field}, input[name="${field}"]`, 'VALID-CODE-123')
});

Then('I should see the workspace in my workspace list', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-test="workspace-card"], [data-testid="workspace-card"]')).toBeVisible()
});

Then('I should see an error indicating the code is invalid', async function (this: CustomWorld) {
  await expect(this.page.locator('text=/invalid|not valid/i')).toBeVisible()
});


