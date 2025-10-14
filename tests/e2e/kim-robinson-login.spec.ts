import { test, expect } from '@playwright/test';

test('Kim Robinson login and superadmin access', async ({ page }) => {
  const deploymentUrl = 'https://changemaker-minimal-481hv49sr-alldigitalrewards.vercel.app';
  
  console.log('Starting test for Kim Robinson login...');
  
  // Navigate to login page
  await page.goto(`${deploymentUrl}/auth/login`);
  await page.waitForLoadState('networkidle');
  
  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"]', 'krobinson@alldigitalrewards.com');
  await page.fill('input[type="password"], input[name="password"]', 'Changemaker2025!');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  console.log('After login, redirected to:', currentUrl);
  
  // Check we're not on login page anymore
  expect(currentUrl).not.toContain('/auth/login');
  
  // Check for common error indicators
  const errorMessages = await page.locator('text=/error|failed|invalid/i').count();
  console.log('Error messages found:', errorMessages);
  expect(errorMessages).toBe(0);
  
  // Navigate to workspaces page
  await page.goto(`${deploymentUrl}/workspaces`);
  await page.waitForLoadState('networkidle');
  
  // Check for superadmin badge
  const superadminBadge = await page.locator('text=/superadmin|🔱/i').count();
  console.log('Superadmin badge found:', superadminBadge > 0);
  
  // Navigate to platform admin dashboard
  await page.goto(`${deploymentUrl}/admin/dashboard`);
  await page.waitForLoadState('networkidle');
  
  // Verify platform admin page loaded
  const platformAdminTitle = await page.locator('text=/platform administration|platform overview/i').count();
  console.log('Platform admin page loaded:', platformAdminTitle > 0);
  expect(platformAdminTitle).toBeGreaterThan(0);
  
  // Navigate to member management
  await page.goto(`${deploymentUrl}/admin/users`);
  await page.waitForLoadState('networkidle');
  
  // Check for member management table
  const memberTable = await page.locator('table').count();
  console.log('Member management table found:', memberTable > 0);
  expect(memberTable).toBeGreaterThan(0);
  
  // Check console for database errors
  const logs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(msg.text());
    }
  });
  
  // Take screenshot of final state
  await page.screenshot({ path: '/tmp/admin-users-page.png', fullPage: true });
  
  console.log('Test completed successfully!');
  console.log('Console errors:', logs.length > 0 ? logs : 'None');
});
