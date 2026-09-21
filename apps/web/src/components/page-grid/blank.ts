/**
 * A page the user inserted rather than one that came from the source document. `PageRef`
 * has no flag for it, so the sentinel lives in `sourceIndex`: nothing to render, and the
 * tool step that consumes the grid's output creates an empty page for it.
 */
export const BLANK_PAGE_SOURCE_INDEX = -1
