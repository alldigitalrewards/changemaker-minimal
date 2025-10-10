import { test, expect } from '@playwright/test';

// Configure for preview environment
// Note: Update this URL to the latest preview deployment from: vercel ls changemaker-minimal
test.use({
  baseURL: 'https://changemaker-minimal-r0opudxll-alldigitalrewards.vercel.app',
});

const ADMIN_EMAIL = 'jfelke@alldigitalrewards.com';
const ADMIN_PASSWORD = 'Changemaker2025!';
const PARTICIPANT_EMAIL = 'john.doe@acme.com';
const PARTICIPANT_PASSWORD = 'Changemaker2025!';

test.describe('Preview Deployment - Core Functionality', () => {

  test('TC1: Login Flow', async ({ page }) => {
    await page.goto('/');

    // Find and click sign in
    await page.click('text=Sign In');

    // Fill credentials
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to workspaces or dashboard
    await page.waitForURL(/workspaces|dashboard/, { timeout: 10000 });

    // Verify logged in state (check for user name or avatar)
    await expect(page.locator('text=jfelke').or(page.locator('[data-testid="user-menu"]'))).toBeVisible();
  });

  test('TC2: Session Persistence', async ({ page, context }) => {
    // Login first
    await page.goto('/');
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/workspaces|dashboard/);

    // Refresh page
    await page.reload();

    // Verify still logged in
    await expect(page.locator('text=jfelke').or(page.locator('[data-testid="user-menu"]'))).toBeVisible();

    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto('/workspaces');

    // Verify session active in new tab
    await expect(newPage.locator('text=jfelke').or(newPage.locator('[data-testid="user-menu"]'))).toBeVisible();
  });

  test('TC3: Workspaces Dashboard Display', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Navigate to workspaces
    await page.goto('/workspaces');

    // Verify stat cards
    await expect(page.locator('text=Your Workspaces')).toBeVisible();
    await expect(page.locator('text=Total Members')).toBeVisible();
    await expect(page.locator('text=Total Challenges')).toBeVisible();

    // Verify discover section
    await expect(page.locator('text=Discover Workspaces')).toBeVisible();
  });

  test('TC4: Points Reward Challenge Creation', async ({ page }) => {
    // Login as admin
    await page.goto('/');
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/workspaces|dashboard/);

    // Navigate to challenges
    await page.goto('/w/alldigitalrewards/admin/challenges');

    // Click create
    await page.click('text=Create Challenge');

    // Fill form
    const timestamp = Date.now();
    await page.fill('input[name="title"]', `Points Test ${timestamp}`);
    await page.fill('textarea[name="description"]', 'Testing points reward');

    // Select points reward type
    await page.selectOption('select[name="rewardType"]', 'points');
    await page.fill('input[name="pointsPerActivity"]', '10');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator(`text=Points Test ${timestamp}`)).toBeVisible({ timeout: 10000 });
  });

  test('TC5: Password Reset Function', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Navigate to profile
    await page.goto('/w/alldigitalrewards/participant/profile');

    // Find and click reset password
    await page.click('text=Reset Password');

    // Fill new password
    await page.fill('input[name="newPassword"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');

    // Submit
    await page.click('button[type="submit"]:has-text("Update")');

    // Verify success message
    await expect(page.locator('text=Password updated successfully')).toBeVisible();

    // Reset back to original
    await page.click('text=Reset Password');
    await page.fill('input[name="newPassword"]', ADMIN_PASSWORD);
    await page.fill('input[name="confirmPassword"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]:has-text("Update")');
  });

  test('TC6: Workspace Isolation Security', async ({ page }) => {
    // Login as user from workspace A
    await page.goto('/');
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', PARTICIPANT_EMAIL);
    await page.fill('input[type="password"]', PARTICIPANT_PASSWORD);
    await page.click('button[type="submit"]');

    // Try to access different workspace directly
    const response = await page.goto('/w/alldigitalrewards/admin/challenges');

    // Verify access denied (403 or redirect)
    expect([403, 302, 307].includes(response?.status() || 0) ||
           page.url().includes('unauthorized') ||
           page.url().includes('login')).toBeTruthy();
  });

  test('TC7: Dynamic Reward Display', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', PARTICIPANT_EMAIL);
    await page.fill('input[type="password"]', PARTICIPANT_PASSWORD);
    await page.click('button[type="submit"]');

    // Navigate to participant challenges
    await page.goto('/w/acme/participant/challenges');

    // Look for challenges with different reward types
    const pointsChallenge = page.locator('text=Points Earned').first();
    const skuChallenge = page.locator('text=Rewards Issued').first();
    const monetaryChallenge = page.locator('text=Rewards Earned').first();

    // Verify at least one reward display is visible
    await expect(
      pointsChallenge.or(skuChallenge).or(monetaryChallenge)
    ).toBeVisible();
  });
});
