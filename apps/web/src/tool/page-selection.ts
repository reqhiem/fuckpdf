import type { ToolId } from '@fuckpdf/tools'
import {
  BLANK_PAGE_SOURCE_INDEX,
  type PageGridCapabilities,
  type PageRef,
} from '../components/page-grid'

/**
 * The four tools that drive their options from the page grid rather than from a form,
 * and what each one lets the user do to a page.
 */
export const GRID_TOOLS: Partial<Record<ToolId, PageGridCapabilities>> = {
  organize: {
    reorder: true,
    select: false,
    rotate: true,
    remove: true,
    duplicate: true,
    insertBlank: true,
  },
  'remove-pages': { reorder: false, select: true, rotate: false, remove: false, duplicate: false },
  'extract-pages': { reorder: false, select: true, rotate: false, remove: false, duplicate: false },
  crop: { reorder: false, select: true, rotate: false, remove: false, duplicate: false },
}

/** "1,3,5-7" — the shape remove-pages and extract-pages parse. */
export function toPageRangeString(pages: PageRef[], selected: ReadonlySet<string>): string {
  const numbers = pages
    .filter((page) => selected.has(page.id))
    .map((page) => page.number)
    .sort((a, b) => a - b)
  const parts: string[] = []
  let start: number | undefined
  let prev: number | undefined
  for (const n of numbers) {
    if (start === undefined || prev === undefined) {
      start = n
      prev = n
      continue
    }
    if (n === prev + 1) {
      prev = n
      continue
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = n
    prev = n
  }
  if (start !== undefined && prev !== undefined) {
    parts.push(start === prev ? `${start}` : `${start}-${prev}`)
  }
  return parts.join(',')
}

/** The grid's page list as the ordered operations organize's step consumes. */
export function toOrganizeOperations(pages: PageRef[]) {
  return pages.map((page) =>
    page.sourceIndex === BLANK_PAGE_SOURCE_INDEX
      ? ({ type: 'blank' } as const)
      : ({
          type: 'page',
          fileIndex: 0,
          pageIndex: page.sourceIndex,
          rotate: page.rotation,
        } as const),
  )
}
