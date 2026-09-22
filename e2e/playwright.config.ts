import { defineConfig, devices } from '@playwright/test'

// The per-tool suite is Chromium-only: it asserts bytes, which come from wasm and pure
// steps that are identical everywhere. The shell specs are what run in all three.
const PER_TOOL = /tools\.spec\.ts/

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --filter web exec vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: PER_TOOL, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: PER_TOOL, use: { ...devices['Desktop Safari'] } },
  ],
})
