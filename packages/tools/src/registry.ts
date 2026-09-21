import type { ToolStep } from './types'

/**
 * Tool ids double as URL slugs (PRD §7). v1 = M0 + M1 only; M2/M3 ids are added when
 * their steps land, so the landing page can never link to a route that does not exist.
 */
export const TOOL_IDS = [
  'merge',
  'split',
  'remove-pages',
  'extract-pages',
  'organize',
  'rotate',
  'page-numbers',
  'watermark',
  'crop',
  'jpg-to-pdf',
  'pdf-to-jpg',
] as const

export type ToolId = (typeof TOOL_IDS)[number]

/**
 * What a tool module must export. Options stay loosely typed here so one generic runner
 * can drive every tool; each module also exports its own precise `*Options` type, which
 * the UI imports directly for its options panel.
 */
export type ToolModule = {
  run: ToolStep<Record<string, unknown>>
  defaultOptions: Record<string, unknown>
  /** Minimum and maximum input files the step accepts. */
  inputs: { min: number; max: number }
  /** Accepted input MIME types, for the dropzone. */
  accept: string[]
}

/**
 * Lazy per-tool imports. This map is the only reason a tool's code is not in the shell
 * bundle (NFR-5), so every entry must stay a bare dynamic import with no side effects.
 */
export const loadTool: Record<ToolId, () => Promise<ToolModule>> = {
  merge: () => import('./merge'),
  split: () => import('./split'),
  'remove-pages': () => import('./remove-pages'),
  'extract-pages': () => import('./extract-pages'),
  organize: () => import('./organize'),
  rotate: () => import('./rotate'),
  'page-numbers': () => import('./page-numbers'),
  watermark: () => import('./watermark'),
  crop: () => import('./crop'),
  'jpg-to-pdf': () => import('./jpg-to-pdf'),
  'pdf-to-jpg': () => import('./pdf-to-jpg'),
}
