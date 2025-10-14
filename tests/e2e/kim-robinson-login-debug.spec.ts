import { test, expect } from '@playwright/test';

test('Kim Robinson login debug', async ({ page }) => {
  const deploymentUrl = 'https://changemaker-minimal-481hv49sr-alldigitalrewards.vercel.app';
  const logs = [];
  const errors = [];
  
  // Capture console messages
  page.on('console', msg => {
    logs.push({type: msg.type(), text: msg.text()});
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    errors.push(`Page error: ${error.message}`);
  });
  
  console.log('Navigating to login page...');
  await page.goto(`${deploymentUrl}/auth/login`);
  await page.waitForLoadState('networkidle');
  
  console.log('Filling in credentials...');
  await page.fill('input[type="email"], input[name="email"]', 'krobinson@alldigitalrewards.com');
  await page.fill('input[type="password"], input[name="password"]', 'Changemaker2025!');
  
  await page.screenshot({ path: '/tmp/before-login.png' });
  
  console.log('Clicking login button...');
  await page.click('button[type="submit"]');
  
  // Wait a bit to see what happens
  await page.waitForTimeout(5000);
  
  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
  
  await page.screenshot({ path: '/tmp/after-login.png' });
  
  console.log('\n=== Console Logs ===');
  logs.forEach(log => console.log(`[${log.type}]`, log.text));
  
  console.log('\n=== Errors ===');
  errors.forEach(err => console.log('ERROR:', err));
  
  expect(errors.length).toBe(0);
});
