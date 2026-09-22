import type { ToolId } from '@fuckpdf/tools'

/* `half` spans three of the six columns, `third` spans two. Every group's counts have to
 * fill their rows exactly or the last row goes ragged. */
export const groups: Array<{ name: string; half: ToolId[]; third: ToolId[] }> = [
  {
    name: 'organize',
    half: ['merge', 'split'],
    third: ['organize', 'remove-pages', 'extract-pages'],
  },
  {
    name: 'edit',
    half: ['edit', 'crop'],
    third: ['rotate', 'page-numbers', 'watermark'],
  },
  { name: 'convert', half: ['jpg-to-pdf', 'pdf-to-jpg'], third: [] },
]

export const toolCount = groups.reduce((n, g) => n + g.half.length + g.third.length, 0)
