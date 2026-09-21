/**
 * The root vitest project collects `packages/*` only — engine adapters and tool steps
 * (PRD §4.1). This one runs the page grid's pure logic, and is deliberately scoped to the
 * component's own folder so it does not touch that config.
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Paths are relative to the repo root, where the command above is run from.
  test: { environment: 'node', include: ['apps/web/src/components/page-grid/*.test.ts'] },
})
