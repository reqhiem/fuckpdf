import { describe, expect, it } from 'vitest'
import { BLANK_PAGE_SOURCE_INDEX } from '../components/page-grid'
import { toOrganizeOperations, toPageRangeString } from './page-selection'

const page = (number: number, sourceIndex = number - 1, rotation = 0) => ({
  id: `p${number}`,
  number,
  rotation,
  sourceIndex,
})

describe('toPageRangeString', () => {
  it('collapses runs and keeps singles', () => {
    const pages = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => page(n))
    const selected = new Set(['p1', 'p3', 'p5', 'p6', 'p7'])
    expect(toPageRangeString(pages, selected)).toBe('1,3,5-7')
  })

  it('is empty when nothing is selected', () => {
    expect(toPageRangeString([page(1)], new Set())).toBe('')
  })
})

describe('toOrganizeOperations', () => {
  it('maps reordered, rotated and inserted pages', () => {
    const ops = toOrganizeOperations([
      page(1, 2, 90),
      { id: 'blank', number: 2, rotation: 0, sourceIndex: BLANK_PAGE_SOURCE_INDEX },
      page(3, 0),
    ])
    expect(ops).toEqual([
      { type: 'page', fileIndex: 0, pageIndex: 2, rotate: 90 },
      { type: 'blank' },
      { type: 'page', fileIndex: 0, pageIndex: 0, rotate: 0 },
    ])
  })
})
