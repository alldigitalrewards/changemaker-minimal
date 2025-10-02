import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for UI testing
 * Supports multiple environments via BASE_URL environment variable
 * 
 * Usage:
 * - Local: pnpm test:e2e (uses http://localhost:3000)
 * - Production: BASE_URL=https://changemaker.im pnpm test:e2e
 * - Custom: BASE_URL=https://your-domain.com pnpm test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: [
    '**/tests/e2e/button-*.spec.ts',
    '**/tests/e2e/button-visibility.spec.ts',
    '**/tests/e2e/simple-button-test.spec.ts',
    '**/tests/e2e/workspace-buttons.spec.ts',
    '**/tests/e2e/workspace-ux-*.spec.ts',
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports for testing responsive button issues
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Only start local server when testing against localhost
  // Use production build for stability during e2e runs
  webServer: process.env.BASE_URL?.startsWith('http://localhost') !== false && !process.env.BASE_URL?.startsWith('https://') ? {
    // Allow swapping env files: ENV_FILE=.env (default .env.local)
    command: `dotenv -e ${process.env.ENV_FILE || '.env.local'} -- sh -c "pnpm prisma:generate && pnpm db:push && pnpm build && pnpm start"`,
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240 * 1000,
  } : undefined,
});