import { defineConfig, devices } from '@playwright/test';

// E2E smoke tests run against the built frontend served by `vite preview`. They check
// that the app boots and the critical pages render; they do not need the backend.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
