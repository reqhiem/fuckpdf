import type { EditRect } from '@fuckpdf/tools'
import { beforeEach, describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, useEditorStore } from './store'

const rect = (id: string, x = 0): EditRect => ({
  id,
  type: 'rect',
  page: 1,
  x,
  y: 0,
  width: 10,
  height: 10,
  fill: '000000',
})

const store = () => useEditorStore.getState()

beforeEach(() => {
  store().reset()
})

describe('history', () => {
  it('walks back and forward through several mutations', () => {
    store().add(rect('a'))
    store().add(rect('b'))
    store().update('b', { x: 40 })

    expect(store().elements.map((element) => element.id)).toEqual(['a', 'b'])
    expect((store().elements[1] as EditRect).x).toBe(40)

    store().undo()
    expect((store().elements[1] as EditRect).x).toBe(0)
    store().undo()
    expect(store().elements.map((element) => element.id)).toEqual(['a'])
    store().undo()
    expect(store().elements).toEqual([])

    store().redo()
    store().redo()
    store().redo()
    expect(store().elements.map((element) => element.id)).toEqual(['a', 'b'])
    expect((store().elements[1] as EditRect).x).toBe(40)
  })

  it('does nothing at either end', () => {
    store().undo()
    store().redo()
    expect(store().elements).toEqual([])
  })

  it('drops the redo stack once a new change lands', () => {
    store().add(rect('a'))
    store().undo()
    store().add(rect('b'))
    expect(store().future).toEqual([])
    store().redo()
    expect(store().elements.map((element) => element.id)).toEqual(['b'])
  })

  it('snapshots once for a gesture, not once per frame', () => {
    store().add(rect('a'))
    store().snapshot()
    store().update('a', { x: 5 }, false)
    store().update('a', { x: 9 }, false)

    expect(store().past).toHaveLength(2)
    store().undo()
    expect((store().elements[0] as EditRect).x).toBe(0)
  })

  it('caps the past at HISTORY_LIMIT, keeping the newest entries', () => {
    const dropped = 10
    store().add(rect('a'))
    for (let x = 1; x <= HISTORY_LIMIT + dropped; x++) store().update('a', { x })

    expect(store().past).toHaveLength(HISTORY_LIMIT)
    for (let i = 0; i < HISTORY_LIMIT; i++) store().undo()
    expect((store().elements[0] as EditRect).x).toBe(dropped)
    expect(store().past).toEqual([])
  })
})

describe('selection', () => {
  it('follows what was added and clears on delete', () => {
    store().add(rect('a'))
    expect(store().selectedId).toBe('a')
    store().remove('a')
    expect(store().selectedId).toBeNull()
  })

  it('keeps an unrelated selection when something else is deleted', () => {
    store().add(rect('a'))
    store().add(rect('b'))
    store().select('a')
    store().remove('b')
    expect(store().selectedId).toBe('a')
  })

  it('drops a selection that undo removed from the document', () => {
    store().add(rect('a'))
    store().add(rect('b'))
    expect(store().selectedId).toBe('b')
    store().undo()
    expect(store().selectedId).toBeNull()
  })
})

describe('reset', () => {
  it('clears elements, history, selection and page', () => {
    store().add(rect('a'))
    store().setPage(4)
    store().setTool('ink')
    store().reset()

    expect(store()).toMatchObject({
      elements: [],
      past: [],
      future: [],
      selectedId: null,
      page: 1,
      activeTool: 'select',
    })
  })
})
