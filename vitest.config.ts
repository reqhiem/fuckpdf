import { defineConfig } from 'vitest/config'

// Engine adapters and tool steps must pass under Node, with no DOM (PRD §4.1). The page
// grid's pure geometry lives in the app but is testable the same way, so it is collected
// here too rather than needing a second config.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
  },
})
