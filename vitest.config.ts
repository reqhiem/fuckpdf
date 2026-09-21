import { defineConfig } from 'vitest/config'

// Engine adapters and tool steps must pass under Node, with no DOM (PRD §4.1).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts'],
  },
})
