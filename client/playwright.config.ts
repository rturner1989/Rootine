import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  // Only match .spec files — Vitest owns .test.* for component tests.
  // Both extensions are accepted until wave 6b narrows this to .spec.ts.
  testMatch: '**/*.spec.{js,ts}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  // Always use the Vite dev server so /api proxy is in play. Locally we
  // attach to the already-running dev stack; in CI we boot a fresh one.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
