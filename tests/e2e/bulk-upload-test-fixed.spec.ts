import { test, expect } from '@playwright/test';

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
  await page.waitForTimeout(1500);
  console.log('✓ Bulk upload dialog opened');
  
  console.log('\n=== Step 4: Upload CSV File ===');
  const fileInput = await page.locator('input[type="file"][accept=".csv"]');
  await fileInput.setInputFiles('/tmp/bulk-upload-test.csv');
  console.log('✓ CSV file selected');
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/before-upload.png' });
  
  console.log('\n=== Step 5: Submit Upload ===');
  // Find the Upload button inside the dialog that's NOT disabled
  const uploadButton = page.locator('[role="dialog"] button:has-text("Upload"):not(:disabled)').last();
  await uploadButton.click();
  
  // Wait for upload to complete
  console.log('Waiting for upload to process...');
  await page.waitForTimeout(10000);
  
  // Check for success message
  const successMessage = await page.locator('text=/successfully created/i').count();
  console.log('Success message found:', successMessage > 0);
  
  // Screenshot the result
  await page.screenshot({ path: '/tmp/after-upload.png', fullPage: true });
  
  console.log('\n=== Step 6: Close Dialog and Verify ===');
  // Press Escape to close dialog
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  
  // Reload page to see all users
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Search for uploaded users
  const users = [
    'jfelke+participant1@alldigitalrewards.com',
    'jfelke+participant2@alldigitalrewards.com',
    'jfelke+admin1@alldigitalrewards.com',
    'jfelke+admin2@alldigitalrewards.com',
    'jfelke+test1@alldigitalrewards.com',
    'jfelke+test2@alldigitalrewards.com'
  ];
  
  console.log('\n=== Verifying Uploaded Users ===');
  for (const email of users) {
    const found = await page.locator(`text=${email}`).count();
    console.log(`${found > 0 ? '✓' : '✗'} ${email}`);
  }
  
  await page.screenshot({ path: '/tmp/members-table-final.png', fullPage: true });
  
  console.log('\n✅ Bulk upload test completed!');
});
