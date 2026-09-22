import type { ToolStep } from './types'

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
  'edit',
  'jpg-to-pdf',
  'pdf-to-jpg',
] as const

export type ToolId = (typeof TOOL_IDS)[number]

export type ToolModule = {
  run: ToolStep<Record<string, unknown>>
  defaultOptions: Record<string, unknown>
  inputs: { min: number; max: number }
  accept: string[]
}

// Bare dynamic imports, no side effects: this map is what keeps tool code out of the
// shell bundle.
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
  edit: () => import('./edit'),
  'jpg-to-pdf': () => import('./jpg-to-pdf'),
  'pdf-to-jpg': () => import('./pdf-to-jpg'),
}
