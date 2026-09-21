/**
 * The page grid is the core UI of the product (PRD §3): organize, remove-pages,
 * extract-pages and crop all render the same component and differ only in which
 * interactions they enable.
 *
 * This file is the contract between the component and the tool pages that use it.
 * Both sides are built in parallel, so neither may change it unilaterally.
 */

export type PageRef = {
  /** Stable id across reorders. Not the page number. */
  id: string
  /** 1-based page number in the CURRENT order. */
  number: number
  /** Clockwise degrees, 0 | 90 | 180 | 270. */
  rotation: number
  /** Index into the source document this page came from. */
  sourceIndex: number
}

export type PageGridCapabilities = {
  reorder?: boolean
  select?: boolean
  rotate?: boolean
  remove?: boolean
  duplicate?: boolean
  insertBlank?: boolean
}

export type PageGridProps = {
  /** The PDF the thumbnails are rendered from. */
  bytes: Uint8Array
  password?: string
  pages: PageRef[]
  onChange: (pages: PageRef[]) => void
  selected?: ReadonlySet<string>
  onSelectedChange?: (selected: ReadonlySet<string>) => void
  capabilities?: PageGridCapabilities
}
