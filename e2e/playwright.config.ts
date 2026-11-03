import { defineConfig, devices } from '@playwright/test'

const PORT = 4310
const isCI = !!process.env.CI
// Local runs use the installed Chrome. CI uses Playwright's full Chromium, not the default
// "headless shell": the shell reports Notification.permission as "denied" even when granted.
const browser = { channel: isCI ? 'chromium' : 'chrome' }

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
    ...browser
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...browser }, grepInvert: /@screenshots/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...browser }, grep: /@mobile/ },
    // README images: pnpm --filter e2e screenshots (writes to .github/assets)
    { name: 'screenshots', use: { ...browser }, grep: /@screenshots/ }
  ],
  webServer: {
    command: 'pnpm --filter server exec tsx tests/e2eServer.ts',
    url: `http://127.0.0.1:${PORT}/health`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: { E2E_PORT: String(PORT) }
  }
})
