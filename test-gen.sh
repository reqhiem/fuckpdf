#!/bin/bash
cd packages/tools/src

cat << 'TEST' > merge.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './merge'

test('merge two pdfs', async () => {
  const p1 = await PDFDocument.create(); p1.addPage();
  const p2 = await PDFDocument.create(); p2.addPage();
  const res = await run([
    { name: '1.pdf', bytes: await p1.save() },
    { name: '2.pdf', bytes: await p2.save() }
  ], { order: ['1.pdf', '2.pdf'] })
  
  expect(res.length).toBe(1)
  const out = await PDFDocument.load(res[0].bytes)
  expect(out.getPageCount()).toBe(2)
})
TEST

cat << 'TEST' > split.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './split'

test('split every-n', async () => {
  const p = await PDFDocument.create(); p.addPage(); p.addPage(); p.addPage();
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], { mode: 'every-n', everyN: 2 })
  expect(res.length).toBe(2)
  const o1 = await PDFDocument.load(res[0].bytes)
  const o2 = await PDFDocument.load(res[1].bytes)
  expect(o1.getPageCount()).toBe(2)
  expect(o2.getPageCount()).toBe(1)
})
TEST

cat << 'TEST' > remove-pages.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './remove-pages'

test('remove pages', async () => {
  const p = await PDFDocument.create(); p.addPage(); p.addPage(); p.addPage();
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], { pages: '2' })
  const out = await PDFDocument.load(res[0].bytes)
  expect(out.getPageCount()).toBe(2)
})
TEST

cat << 'TEST' > extract-pages.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './extract-pages'

test('extract pages', async () => {
  const p = await PDFDocument.create(); p.addPage(); p.addPage(); p.addPage();
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], { pages: '1,3' })
  const out = await PDFDocument.load(res[0].bytes)
  expect(out.getPageCount()).toBe(2)
})
TEST

cat << 'TEST' > organize.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './organize'

test('organize pages', async () => {
  const p = await PDFDocument.create(); p.addPage();
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], { operations: [
    { type: 'page', fileIndex: 0, pageIndex: 0 },
    { type: 'blank' }
  ]})
  const out = await PDFDocument.load(res[0].bytes)
  expect(out.getPageCount()).toBe(2)
})
TEST

cat << 'TEST' > rotate.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './rotate'

test('rotate pages', async () => {
  const p = await PDFDocument.create(); p.addPage();
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], { angle: 90 })
  const out = await PDFDocument.load(res[0].bytes)
  expect(out.getPages()[0].getRotation().angle).toBe(90)
})
TEST

cat << 'TEST' > page-numbers.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './page-numbers'

test('page numbers', async () => {
  const p = await PDFDocument.create(); p.addPage();
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], {
    position: 'bottom-center', firstNumber: 1, format: '{n}', font: 'Helvetica', size: 12, color: '000000', margin: 20
  })
  expect(res.length).toBe(1)
})
TEST

cat << 'TEST' > watermark.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './watermark'

test('watermark', async () => {
  const p = await PDFDocument.create(); p.addPage();
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], {
    type: 'text', text: 'HELLO', mode: 'positioned', opacity: 0.5, rotation: 0, layer: 'over'
  })
  expect(res.length).toBe(1)
})
TEST

cat << 'TEST' > crop.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './crop'
import type { PdfiumEngine, PdfiumDocument, RenderOptions, RenderedPage } from '@fuckpdf/engine-pdfium/src/types'

test('crop set cropbox', async () => {
  const p = await PDFDocument.create(); p.addPage([100, 100]);
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], { box: { x: 10, y: 10, width: 80, height: 80 } })
  const out = await PDFDocument.load(res[0].bytes)
  const cb = out.getPages()[0].getCropBox()
  expect(cb.x).toBe(10)
  expect(cb.width).toBe(80)
})

test('crop flatten mocked engine', async () => {
  const fakeEngine: PdfiumEngine = {
    open: async () => ({}) as any,
    withDocument: async (bytes, fn) => {
      const doc: PdfiumDocument = {
        pageCount: 1,
        pageSize: () => ({ width: 100, height: 100 }),
        render: async () => ({ width: 100, height: 100, data: new Uint8Array(40000) }),
        extractText: async () => '',
        close: () => {}
      }
      return fn(doc)
    }
  }
  const p = await PDFDocument.create(); p.addPage();
  // It throws error because flatten crop isn't fully implemented without encoding
  await expect(run([{ name: '1.pdf', bytes: await p.save() }], { box: { x:0, y:0, width:50, height:50 }, flatten: true, engine: fakeEngine }))
    .rejects.toThrow('Flattening crop not fully implemented')
})
TEST

cat << 'TEST' > jpg-to-pdf.test.ts
import { test, expect } from 'vitest'
import { run } from './jpg-to-pdf'

test('jpg-to-pdf throws on bad input', async () => {
  await expect(run([{ name: '1.jpg', bytes: new Uint8Array([1,2,3]) }], {
    pageSize: 'A4', orientation: 'portrait', margin: 0, fitMode: 'contain'
  })).rejects.toThrow()
})
TEST

cat << 'TEST' > pdf-to-jpg.test.ts
import { test, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { run } from './pdf-to-jpg'
import type { PdfiumEngine, PdfiumDocument } from '@fuckpdf/engine-pdfium/src/types'

test('pdf-to-jpg with mocked engine', async () => {
  let renderCalled = false
  const fakeEngine: PdfiumEngine = {
    open: async () => ({}) as any,
    withDocument: async (bytes, fn) => {
      const doc: PdfiumDocument = {
        pageCount: 2,
        pageSize: () => ({ width: 100, height: 100 }),
        render: async () => {
          renderCalled = true
          return { width: 100, height: 100, data: new Uint8Array([255, 0, 0, 255]) }
        },
        extractText: async () => '',
        close: () => {}
      }
      return fn(doc)
    }
  }
  const p = await PDFDocument.create(); p.addPage(); p.addPage();
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], {
    engine: fakeEngine, dpi: 72, format: 'jpeg', encode: async (rgba) => rgba
  })
  expect(renderCalled).toBe(true)
  expect(res.length).toBe(1)
  expect(res[0].mime).toBe('application/zip') // Since there are 2 pages, it zips them
})
TEST
