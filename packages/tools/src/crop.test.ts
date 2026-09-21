import type { PdfiumDocument, PdfiumEngine } from '@fuckpdf/engine-pdfium'
import { PDFDocument } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './crop'

test('crop set cropbox', async () => {
  const p = await PDFDocument.create()
  p.addPage([100, 100])
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], {
    box: { x: 10, y: 10, width: 80, height: 80 },
  })
  if (!res[0]) throw new Error('fail')
  const out = await PDFDocument.load(res[0].bytes)
  const cb = out.getPages()[0]?.getCropBox()
  if (!cb) throw new Error('fail')
  expect(cb.x).toBe(10)
  expect(cb.width).toBe(80)
})

test('crop flatten mocked engine', async () => {
  const fakeEngine: PdfiumEngine = {
    open: async () => ({}) as unknown as PdfiumDocument,
    withDocument: async <T>(
      _bytes: Uint8Array,
      fn: (doc: PdfiumDocument) => Promise<T>,
      _pwd?: string,
    ): Promise<T> => {
      const doc: PdfiumDocument = {
        pageCount: 1,
        pageSize: async () => ({ width: 100, height: 100 }),
        render: async () => ({ width: 100, height: 100, data: new Uint8Array(40000) }),
        extractText: async () => '',
        close: () => {},
      }
      return fn(doc)
    },
  }
  const p = await PDFDocument.create()
  p.addPage()
  // It throws error because flatten crop isn't fully implemented without encoding
  await expect(
    run([{ name: '1.pdf', bytes: await p.save() }], {
      box: { x: 0, y: 0, width: 50, height: 50 },
      flatten: true,
      engine: fakeEngine,
    }),
  ).rejects.toThrow('Flattening crop not fully implemented')
})
