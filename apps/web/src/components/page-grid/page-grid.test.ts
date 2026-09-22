import { expect, test } from 'vitest'
import { toPdfPoints } from './crop'
import { createLimiter } from './limit'

const box = { width: 100, height: 141 }
const a4 = { width: 595, height: 842 }

test('an unrotated drag becomes PDF points with a bottom-left origin', () => {
  const rect = toPdfPoints({ left: 0, top: 0, width: 50, height: 70.5 }, box, a4, 0)
  expect(rect.x).toBeCloseTo(0)
  expect(rect.width).toBeCloseTo(297.5)
  expect(rect.height).toBeCloseTo(421)
  expect(rect.y).toBeCloseTo(421)
})

test('a 180 degree page maps the same drag to the opposite corner', () => {
  const rect = toPdfPoints({ left: 0, top: 0, width: 50, height: 70.5 }, box, a4, 180)
  expect(rect.x).toBeCloseTo(297.5)
  expect(rect.y).toBeCloseTo(0)
  expect(rect.width).toBeCloseTo(297.5)
  expect(rect.height).toBeCloseTo(421)
})

test('a 90 degree page swaps the axes', () => {
  // Clockwise puts the page's left edge along the top, so the display's left half is the
  // page's bottom half.
  const rect = toPdfPoints({ left: 0, top: 0, width: 50, height: 141 }, box, a4, 90)
  expect(rect.x).toBeCloseTo(0)
  expect(rect.y).toBeCloseTo(0)
  expect(rect.width).toBeCloseTo(595)
  expect(rect.height).toBeCloseTo(421)
})

test('a drag outside the thumbnail is clamped to the page', () => {
  const rect = toPdfPoints({ left: -40, top: -40, width: 400, height: 400 }, box, a4, 0)
  expect(rect).toEqual({ x: 0, y: 0, width: 595, height: 842 })
})

test('the limiter never runs more than its cap at once', async () => {
  const limit = createLimiter(4)
  let running = 0
  let peak = 0

  await Promise.all(
    Array.from({ length: 300 }, () =>
      limit(async () => {
        running++
        peak = Math.max(peak, running)
        await new Promise((resolve) => setTimeout(resolve, 1))
        running--
      }),
    ),
  )

  expect(peak).toBe(4)
  expect(running).toBe(0)
})

test('the limiter releases its slot when a task throws', async () => {
  const limit = createLimiter(1)
  await expect(limit(() => Promise.reject(new Error('nope')))).rejects.toThrow('nope')
  await expect(limit(() => Promise.resolve('ok'))).resolves.toBe('ok')
})
