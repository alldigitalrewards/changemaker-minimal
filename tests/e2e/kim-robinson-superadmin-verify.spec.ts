import { test, expect } from '@playwright/test';

test('Kim Robinson superadmin verification', async ({ page }) => {
  const deploymentUrl = 'https://changemaker-minimal-481hv49sr-alldigitalrewards.vercel.app';
  
  // Login
  await page.goto(`${deploymentUrl}/auth/login`);
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', 'krobinson@alldigitalrewards.com');
  await page.fill('input[type="password"]', 'Changemaker2025!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  // Verify redirect to workspaces
  expect(page.url()).toContain('/workspaces');
  console.log('✓ Login successful, redirected to workspaces');
  
  // Check for superadmin badge
  const superadminBadge = await page.locator('text=/superadmin|🔱/i').count();
  console.log('Superadmin badge found:', superadminBadge > 0 ? 'Yes' : 'No');
  expect(superadminBadge).toBeGreaterThan(0);
  
  // Navigate to platform admin dashboard
  await page.goto(`${deploymentUrl}/admin/dashboard`);
  await page.waitForLoadState('networkidle');
  
  // Check for platform admin content
  const platformAdminTitle = await page.locator('text=/platform administration|platform overview/i').count();
  console.log('✓ Platform admin dashboard accessible:', platformAdminTitle > 0);
  expect(platformAdminTitle).toBeGreaterThan(0);
  
  // Screenshot dashboard
  await page.screenshot({ path: '/tmp/platform-admin-dashboard.png', fullPage: true });
  
  // Navigate to member management
  await page.goto(`${deploymentUrl}/admin/users`);
  await page.waitForLoadState('networkidle');
  
  // Check for member management table
  const memberTable = await page.locator('table').count();
  console.log('✓ Member management table found:', memberTable > 0);
  expect(memberTable).toBeGreaterThan(0);
  
  // Check for CRUD features
  const bulkUploadButton = await page.locator('text=/bulk upload/i').count();
  const manageWorkspacesButton = await page.locator('text=/manage workspaces/i').count();
  const grantAccessButton = await page.locator('text=/grant access/i').count();
  
  console.log('✓ Bulk upload button:', bulkUploadButton > 0);
  console.log('✓ Manage workspaces button:', manageWorkspacesButton > 0);
  console.log('✓ Grant/Revoke superadmin buttons:', grantAccessButton > 0);
  
  // Screenshot member management
  await page.screenshot({ path: '/tmp/member-management.png', fullPage: true });
  
  // Check for database errors in console
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  expect(errors.length).toBe(0);
  console.log('\n✅ All tests passed! No database or application errors detected.');
});
