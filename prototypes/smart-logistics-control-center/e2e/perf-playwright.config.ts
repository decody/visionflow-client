import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3015';

export default defineConfig({
  testDir: '.',
  testMatch: 'browser-perf.spec.ts',
  fullyParallel: false,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --turbopack -p 3015',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
