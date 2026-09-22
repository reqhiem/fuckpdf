import { decodePDFRawStream, PDFArray, PDFDocument, type PDFPage, type PDFRawStream } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './edit'
import type { EditElement } from './edit-types'
import { TEXT_ASCENT, TEXT_LINE_HEIGHT } from './edit-types'

const H = 600

/** 1×1 PNG, the smallest thing `embedPng` will accept. */
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)

async function fixture() {
  const p = await PDFDocument.create()
  p.addPage([400, H])
  return { name: 'in.pdf', bytes: await p.save() }
}

async function edit(elements: EditElement[]) {
  const res = await run([await fixture()], { elements })
  if (!res[0]) throw new Error('no output')
  return PDFDocument.load(res[0].bytes)
}

/** pdf-lib flate-encodes the content stream it writes, so read it back through the decoder. */
function contentOf(page: PDFPage): string {
  const contents = page.node.Contents()
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((ref) => page.doc.context.lookup(ref) as PDFRawStream)
      : [contents as PDFRawStream]
  return streams.map((s) => new TextDecoder().decode(decodePDFRawStream(s).decode())).join('\n')
}

test('one of every element type produces a loadable document', async () => {
  const at = { page: 1, x: 10, y: 20 }
  const out = await edit([
    { id: 'a', type: 'text', ...at, text: 'one\ntwo', size: 12, font: 'times', color: '112233' },
    { id: 'b', type: 'image', ...at, bytes: PNG, mime: 'image/png', width: 30, height: 30 },
    { id: 'c', type: 'rect', ...at, width: 50, height: 40, fill: 'ff0000', stroke: '00ff00' },
    { id: 'd', type: 'ellipse', ...at, width: 50, height: 40, stroke: '#0000ff', strokeWidth: 2 },
    { id: 'e', type: 'line', ...at, x2: 100, y2: 100, stroke: '000000', strokeWidth: 3 },
    {
      id: 'f',
      type: 'ink',
      ...at,
      points: [0, 0, 10, 10, 20, 5],
      stroke: 'zzzzzz',
      strokeWidth: 1,
    },
    { id: 'g', type: 'highlight', ...at, width: 80, height: 14, color: 'ffff00' },
  ])
  expect(out.getPageCount()).toBe(1)
})

test('an element on a page that does not exist is ignored', async () => {
  const out = await edit([
    { id: 'a', type: 'rect', page: 99, x: 0, y: 0, width: 10, height: 10, fill: '000000' },
    { id: 'b', type: 'rect', page: 0, x: 0, y: 0, width: 10, height: 10, fill: '000000' },
  ])
  expect(out.getPageCount()).toBe(1)
})

test('text baselines land where the top-left contract says', async () => {
  const size = 20
  const base = { type: 'text', page: 1, x: 5, size, font: 'helvetica', color: '000000' } as const
  const out = await edit([
    { ...base, id: 'a', y: 100, text: 'first' },
    { ...base, id: 'b', y: 100 + size * TEXT_LINE_HEIGHT, text: 'second' },
  ])
  const page = out.getPages()[0]
  if (!page) throw new Error('no page')
  const baselines = [...contentOf(page).matchAll(/([\d.-]+) ([\d.-]+) Tm/g)].map((m) =>
    Number(m[2]),
  )
  const first = H - (100 + size * TEXT_ASCENT)
  expect(baselines).toEqual([first, first - size * TEXT_LINE_HEIGHT])
})

test('no elements leaves the document alone', async () => {
  const out = await edit([])
  expect(out.getPageCount()).toBe(1)
})
