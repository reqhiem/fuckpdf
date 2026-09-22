import type { ToolId } from '@fuckpdf/tools'

/**
 * Landing groups, ordered as in PRD §2. The eleven tools are not equally important, so a
 * group is two lists rather than one: `half` tools get a half-width card, `third` tools a
 * third-width one. On the six-column grid every group's counts (3+3, 2+2+2) fill their rows
 * exactly, which is what stops the last row going ragged.
 */
export const groups: Array<{ name: string; half: ToolId[]; third: ToolId[] }> = [
  {
    name: 'organize',
    half: ['merge', 'split'],
    third: ['organize', 'remove-pages', 'extract-pages'],
  },
  { name: 'edit', half: ['rotate', 'page-numbers', 'watermark', 'crop'], third: [] },
  { name: 'convert', half: ['jpg-to-pdf', 'pdf-to-jpg'], third: [] },
]

export const toolCount = groups.reduce((n, g) => n + g.half.length + g.third.length, 0)
