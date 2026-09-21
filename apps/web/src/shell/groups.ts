import type { ToolId } from '@fuckpdf/tools'

/** Landing groups, ordered as in PRD §2. */
export const groups: Array<{ name: string; tools: ToolId[] }> = [
  { name: 'organize', tools: ['merge', 'split', 'remove-pages', 'extract-pages', 'organize'] },
  { name: 'edit', tools: ['rotate', 'page-numbers', 'watermark', 'crop'] },
  { name: 'convert', tools: ['jpg-to-pdf', 'pdf-to-jpg'] },
]
