/**
 * Minimal concurrency gate. One worker serves the whole grid, so a 300-page document must
 * never hand it 300 renders at once: that queues 300 decoded pages worth of memory for
 * thumbnails the user has not scrolled to (PRD NFR-3).
 */
export type Limiter = <T>(task: () => Promise<T>) => Promise<T>

export function createLimiter(max: number): Limiter {
  let active = 0
  const waiting: Array<() => void> = []

  // The slot is taken at grant time, not when the resumed caller runs, so a caller
  // arriving in between cannot steal it and push `active` past `max`.
  const acquire = (): Promise<void> => {
    if (active < max) {
      active++
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      waiting.push(() => {
        active++
        resolve()
      })
    })
  }

  const release = () => {
    active--
    waiting.shift()?.()
  }

  return async <T>(task: () => Promise<T>): Promise<T> => {
    await acquire()
    try {
      return await task()
    } finally {
      release()
    }
  }
}
