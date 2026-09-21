import { defineConfig, devices } from '@playwright/test'

/**
 * The per-tool suite runs on Chromium only.
 *
 * What it asserts is the bytes a tool produces, and those come out of wasm engines and
 * pure steps that are identical in every browser — so running it three times would triple
 * a slow suite for no new coverage. What genuinely differs per browser is the shell:
 * routing, the dropzone, downloads and the zero-egress guarantee. Those specs keep running
 * everywhere.
 */
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
