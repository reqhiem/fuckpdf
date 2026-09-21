import type { PdfiumDocument, PdfiumEngine } from '@fuckpdf/engine-pdfium'
import { PDFDocument } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './pdf-to-jpg'

test('pdf-to-jpg with mocked engine', async () => {
  let renderCalled = false
  const fakeEngine: PdfiumEngine = {
    open: async () => ({}) as unknown as PdfiumDocument,
    withDocument: async <T>(
      _bytes: Uint8Array,
      fn: (doc: PdfiumDocument) => Promise<T>,
      _pwd?: string,
    ): Promise<T> => {
      const doc: PdfiumDocument = {
        pageCount: 2,
        pageSize: async () => ({ width: 100, height: 100 }),
        render: async () => {
          renderCalled = true
          return { width: 100, height: 100, data: new Uint8Array([255, 0, 0, 255]) }
        },
        extractText: async () => '',
        close: () => {},
      }
      return fn(doc)
    },
  }
  const p = await PDFDocument.create()
  p.addPage()
  p.addPage()
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], {
    engine: fakeEngine,
    dpi: 72,
    format: 'jpeg',
    encode: async (rgba: Uint8Array) => rgba,
  })
  expect(renderCalled).toBe(true)
  expect(res.length).toBe(1)
  expect(res[0]?.mime).toBe('application/zip') // Since there are 2 pages, it zips them
})
