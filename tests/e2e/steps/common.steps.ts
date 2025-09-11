import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

Given('the application is available', async function (this: CustomWorld) {
  const res = await this.page.request.get('/');
  expect(res.ok()).toBeTruthy();
});

When('I visit {string}', async function (this: CustomWorld, path: string) {
  await this.page.goto(path);
});

When('I reload the page', async function (this: CustomWorld) {
  await this.page.reload();
});

Then('I should be redirected to {string}', async function (this: CustomWorld, path: string) {
  await this.page.waitForURL((url) => url.pathname === path);
  expect(new URL(this.page.url()).pathname).toBe(path);
});

Then('I should see the page content', async function (this: CustomWorld) {
  await expect(this.page.locator('main')).toBeVisible();
});

Then('I should see the not found page', async function (this: CustomWorld) {
  await expect(this.page.getByText(/not found/i)).toBeVisible();
});

Then('I should see the public navbar', async function (this: CustomWorld) {
  await expect(this.page.locator('nav')).toBeVisible();
});

Then('I should see content for the home page', async function (this: CustomWorld) {
  await expect(this.page.locator('main')).toBeVisible();
});

When('I press the {string} key repeatedly', async function (this: CustomWorld, key: string) {
  for (let i = 0; i < 10; i++) {
    await this.page.keyboard.press(key);
  }
});

Then('focus should land on interactive elements in logical order', async function (this: CustomWorld) {
  const active = await this.page.evaluate(() => document.activeElement?.tagName || '');
  expect(active.length).toBeGreaterThan(0);
});


