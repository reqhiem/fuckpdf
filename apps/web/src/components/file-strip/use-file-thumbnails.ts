import { useEffect, useMemo, useReducer } from 'react'
import { createLimiter } from '../page-grid/limit'
import { renderFile, type Thumb } from './thumb'

/** Lower than the grid's cap: each render here holds a whole PDF open, not one page. */
export const MAX_FILE_RENDERS_IN_FLIGHT = 3

const THUMBNAIL_DPI = 36

export type FileThumbnail = Thumb | { failed: true }

export const isRendered = (state: FileThumbnail | undefined): state is Thumb =>
  !!state && 'url' in state

export function useFileThumbnails(files: File[]): ReadonlyMap<File, FileThumbnail | undefined> {
  const cache = useMemo(() => new Map<File, FileThumbnail | undefined>(), [])
  const limit = useMemo(() => createLimiter(MAX_FILE_RENDERS_IN_FLIGHT), [])
  const [, bump] = useReducer((tick: number) => tick + 1, 0)

  useEffect(() => {
    const settle = (file: File, state: FileThumbnail) => {
      // The file left the list while it rendered; nothing will show this URL.
      if (!cache.has(file)) {
        if ('url' in state) URL.revokeObjectURL(state.url)
        return
      }
      cache.set(file, state)
      bump()
    }

    for (const file of files) {
      if (cache.has(file)) continue
      // Present with no state is the "started" marker; the effect re-runs on every change.
      cache.set(file, undefined)
      void limit(() => renderFile(file, THUMBNAIL_DPI))
        .then((thumb) => settle(file, thumb))
        .catch(() => settle(file, { failed: true }))
    }

    for (const [file, state] of cache) {
      if (files.includes(file)) continue
      if (state && 'url' in state) URL.revokeObjectURL(state.url)
      cache.delete(file)
    }
  }, [files, cache, limit])

  useEffect(
    () => () => {
      for (const state of cache.values()) {
        if (state && 'url' in state) URL.revokeObjectURL(state.url)
      }
      cache.clear()
    },
    [cache],
  )

  return cache
}
