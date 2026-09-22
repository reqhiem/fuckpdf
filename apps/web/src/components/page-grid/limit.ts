export type Limiter = <T>(task: () => Promise<T>) => Promise<T>

export function createLimiter(max: number): Limiter {
  let active = 0
  const waiting: Array<() => void> = []

  // The slot is taken at grant time, not when the resumed caller runs, or a caller
  // arriving in between steals it and pushes `active` past `max`.
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
