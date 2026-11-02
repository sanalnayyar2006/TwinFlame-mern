import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setup.ts'],
    // Each file gets a fresh module graph, so per-file env (production CORS, rate limits) can't leak
    isolate: true,
    testTimeout: 20_000,
    hookTimeout: 60_000
  }
})
