// Cells subscribe per page rather than to one state object, so a finished render
// re-renders one cell instead of three hundred.
import { useEffect, useMemo } from 'react'
import { openPdf, type PdfDocument } from '../../workers/pdfium-client'
import type { Size } from './crop'
import { createLimiter } from './limit'

/** The worker decodes one at a time; a few queued keep it fed across the round-trip. */
export const MAX_RENDERS_IN_FLIGHT = 4

/** Under the 100 ms/page budget, still sharp on a 2x cell. */
const THUMBNAIL_DPI = 36

export type Thumbnail = {
  url?: string
  /** PDF points. Needed to report a crop rectangle. */
  size?: Size
  error?: Error
}

export type ThumbnailStore = {
  /** Starts or joins the render. Call the result to release it. */
  acquire(sourceIndex: number): () => void
  get(sourceIndex: number): Thumbnail | undefined
  subscribe(sourceIndex: number, listener: () => void): () => void
}

type Entry = {
  refs: number
  started: boolean
  state: Thumbnail | undefined
  listeners: Set<() => void>
}

const asError = (caught: unknown): Error =>
  caught instanceof Error ? caught : new Error(String(caught))

const createStore = (bytes: Uint8Array, password?: string): ThumbnailStore & { reset(): void } => {
  const limit = createLimiter(MAX_RENDERS_IN_FLIGHT)
  const entries = new Map<number, Entry>()
  let doc: Promise<PdfDocument> | undefined

  // A copy: `openPdf` detaches what it is given, and `bytes` is what the step will run on.
  const open = () => {
    doc ??= openPdf(bytes.slice().buffer as ArrayBuffer, password)
    return doc
  }

  const notify = (entry: Entry) => {
    for (const listener of entry.listeners) listener()
  }

  const settle = (entry: Entry, state: Thumbnail) => {
    if (entry.refs <= 0) {
      // Scrolled away mid-render: nothing will show this URL.
      if (state.url) URL.revokeObjectURL(state.url)
      return
    }
    if (entry.state?.url && entry.state.url !== state.url) URL.revokeObjectURL(entry.state.url)
    entry.state = state
    notify(entry)
  }

  const start = (sourceIndex: number, entry: Entry) => {
    entry.started = true
    void limit(async () => {
      if (entry.refs <= 0) return
      const document = await open()
      const page = Math.min(Math.max(sourceIndex + 1, 1), document.pageCount)
      const [blob, size] = await Promise.all([
        document.thumbnail(page, THUMBNAIL_DPI),
        document.pageSize(page),
      ])
      settle(entry, { url: URL.createObjectURL(blob), size })
    }).catch((caught) => settle(entry, { error: asError(caught) }))
  }

  // The entry stays in the map because cells subscribe to it; only the pixels go.
  const drop = (entry: Entry) => {
    if (entry.state?.url) URL.revokeObjectURL(entry.state.url)
    entry.state = undefined
    entry.started = false
    notify(entry)
  }

  const entryFor = (sourceIndex: number): Entry => {
    const existing = entries.get(sourceIndex)
    if (existing) return existing
    const created: Entry = { refs: 0, started: false, state: undefined, listeners: new Set() }
    entries.set(sourceIndex, created)
    return created
  }

  return {
    acquire(sourceIndex) {
      const entry = entryFor(sourceIndex)
      entry.refs++
      if (!entry.started) start(sourceIndex, entry)
      return () => {
        entry.refs--
        if (entry.refs <= 0) drop(entry)
      }
    },

    get: (sourceIndex) => entries.get(sourceIndex)?.state,

    subscribe(sourceIndex, listener) {
      const entry = entryFor(sourceIndex)
      entry.listeners.add(listener)
      return () => {
        entry.listeners.delete(listener)
      }
    },

    /** Re-opens lazily if used again, which is what dev's double-invoked effects need. */
    reset() {
      for (const entry of entries.values()) drop(entry)
      const closing = doc
      doc = undefined
      void closing?.then((document) => document.close()).catch(() => undefined)
    },
  }
}

export function useThumbnails(bytes: Uint8Array, password?: string): ThumbnailStore {
  const store = useMemo(() => createStore(bytes, password), [bytes, password])
  useEffect(() => () => store.reset(), [store])
  return store
}
