import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5199',
  },
  webServer: {
    command: 'npm run dev -- --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: !process.env.CI,
    // Force MSW mocks on for the e2e run regardless of the local .env, which may
    // set VITE_USE_MOCKS=false for real-backend development.
    env: { VITE_USE_MOCKS: 'true' },
  },
})
