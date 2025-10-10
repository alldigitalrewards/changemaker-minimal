import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for comprehensive testing
 * Supports multiple environments via BASE_URL environment variable
 *
 * Usage:
 * - All tests: pnpm test (runs e2e, api, integration)
 * - E2E only: pnpm test:e2e
 * - API only: pnpm test tests/api
 * - Integration: pnpm test tests/integration
 * - Production: BASE_URL=https://changemaker.im pnpm test:e2e
 * - Custom: BASE_URL=https://your-domain.com pnpm test:e2e
 */
export default defineConfig({
  testDir: './tests',
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
    // Other browsers disabled for faster testing during development
    // Re-enable for comprehensive cross-browser testing before production
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Only start local server when testing against localhost
  // Reuse existing dev server if available (faster for development)
  webServer: process.env.BASE_URL?.startsWith('http://localhost') !== false && !process.env.BASE_URL?.startsWith('https://') ? {
    command: 'SKIP_SUPABASE=1 pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  } : undefined,
});
