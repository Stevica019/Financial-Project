import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'node e2e/serve-backend.mjs', url: 'http://127.0.0.1:8011/api/health', reuseExistingServer: false, timeout: 60000 },
    { command: 'npm run dev -- --port 5174', url: 'http://127.0.0.1:5174', reuseExistingServer: false, env: { API_PROXY_TARGET: 'http://127.0.0.1:8011' } },
  ],
})
