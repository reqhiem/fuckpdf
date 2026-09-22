export type PageRef = {
  /** Stable across reorders. Not the page number. */
  id: string
  /** 1-based, in the current order. */
  number: number
  /** Clockwise degrees: 0, 90, 180 or 270. */
  rotation: number
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
  bytes: Uint8Array
  password?: string
  pages: PageRef[]
  onChange: (pages: PageRef[]) => void
  selected?: ReadonlySet<string>
  onSelectedChange?: (selected: ReadonlySet<string>) => void
  capabilities?: PageGridCapabilities
}
