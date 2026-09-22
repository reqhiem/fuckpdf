import { defineConfig } from 'vitest/config'

// Everything collected here runs under Node with no DOM, app code included.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
  },
})
