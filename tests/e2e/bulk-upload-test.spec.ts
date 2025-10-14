import { test, expect } from '@playwright/test';
import * as path from 'path';

test('Bulk upload with jfelke email aliases', async ({ page }) => {
  const deploymentUrl = 'https://changemaker-minimal-481hv49sr-alldigitalrewards.vercel.app';
  
  console.log('=== Step 1: Login as Kim Robinson ===');
  await page.goto(`${deploymentUrl}/auth/login`);
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', 'krobinson@alldigitalrewards.com');
  await page.fill('input[type="password"]', 'Changemaker2025!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  expect(page.url()).toContain('/workspaces');
  console.log('✓ Logged in successfully');
  
  console.log('\n=== Step 2: Navigate to Member Management ===');
  await page.goto(`${deploymentUrl}/admin/users`);
  await page.waitForLoadState('networkidle');
  console.log('✓ On member management page');
  
  console.log('\n=== Step 3: Open Bulk Upload Dialog ===');
  await page.click('button:has-text("Bulk Upload")');
  await page.waitForTimeout(1000);
  console.log('✓ Bulk upload dialog opened');
  
  console.log('\n=== Step 4: Upload CSV File ===');
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('/tmp/bulk-upload-test.csv');
  console.log('✓ CSV file selected');
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/before-upload.png' });
  
  console.log('\n=== Step 5: Submit Upload ===');
  await page.click('button:has-text("Upload")');
  
  // Wait for upload to complete
  await page.waitForTimeout(5000);
  
  // Check for success message
  const successMessage = await page.locator('text=/successfully created/i').count();
  console.log('Success message found:', successMessage > 0);
  
  // Screenshot the result
  await page.screenshot({ path: '/tmp/after-upload.png', fullPage: true });
  
  // Check for any errors in the response
  const errorMessages = await page.locator('text=/error|failed/i').count();
  console.log('Error messages:', errorMessages);
  
  // Wait a bit more for the page to update
  await page.waitForTimeout(2000);
  
  console.log('\n=== Step 6: Verify Users in Table ===');
  // Close dialog if still open
  const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
  if (dialogVisible) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }
  
  // Reload to see new users
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Check for the uploaded users
  const user1 = await page.locator('text=jfelke+participant1@alldigitalrewards.com').count();
  const user2 = await page.locator('text=jfelke+admin1@alldigitalrewards.com').count();
  
  console.log('✓ jfelke+participant1 found:', user1 > 0);
  console.log('✓ jfelke+admin1 found:', user2 > 0);
  
  await page.screenshot({ path: '/tmp/members-table-updated.png', fullPage: true });
  
  console.log('\n✅ Bulk upload test completed!');
});
