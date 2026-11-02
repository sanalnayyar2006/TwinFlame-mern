import { defineConfig, devices } from '@playwright/test'

const PORT = 4310
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  // One server and one rate-limit window for the whole run, so keep it serial
  workers: 1,
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Local runs use the installed Chrome; CI installs Playwright's Chromium
    ...(isCI ? {} : { channel: 'chrome' })
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...(isCI ? {} : { channel: 'chrome' }) } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...(isCI ? {} : { channel: 'chrome' }) }, grep: /@mobile/ }
  ],
  webServer: {
    command: 'pnpm --filter server exec tsx tests/e2eServer.ts',
    url: `http://127.0.0.1:${PORT}/health`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: { E2E_PORT: String(PORT) }
  }
})
