import { readFile } from 'node:fs/promises'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { expect, test } from 'vitest'
import { createPdfiumEngine } from './engine'

const MARKER = 'fuckpdf-fixture'

// Served from our own origin in the browser (see ./wasm.ts); read off disk under Node.
const engine = createPdfiumEngine(() =>
  readFile(new URL('../node_modules/@embedpdf/pdfium/dist/pdfium.wasm', import.meta.url)),
)

async function fixture(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const page = pdf.addPage([200, 100])
  page.drawText(MARKER, { x: 10, y: 40, size: 12, font })
  pdf.addPage([200, 100])
  return pdf.save()
}

test('opens, measures, renders and reads a PDF', async () => {
  const bytes = await fixture()

  await engine.withDocument(bytes, async (doc) => {
    expect(doc.pageCount).toBe(2)
    expect(doc.pageSize(1)).toEqual({ width: 200, height: 100 })

    const rendered = await doc.render({ page: 1, dpi: 144 })
    expect(rendered.width).toBe(400)
    expect(rendered.height).toBe(200)
    expect(rendered.data.length).toBe(rendered.width * rendered.height * 4)
    // Something was drawn: a blank page would be pure white.
    expect(rendered.data.some((v) => v !== 0xff)).toBe(true)

    expect(await doc.extractText(1)).toContain(MARKER)
    expect(await doc.extractText(2)).toBe('')

    await expect(doc.render({ page: 3, dpi: 72 })).rejects.toThrow(RangeError)
  })
})

test('withDocument closes the document when the body throws', async () => {
  const bytes = await fixture()
  let doc: Awaited<ReturnType<typeof engine.open>> | undefined

  await expect(
    engine.withDocument(bytes, async (d) => {
      doc = d
      throw new Error('boom')
    }),
  ).rejects.toThrow('boom')

  expect(() => doc?.pageCount).not.toThrow()
  await expect(doc?.extractText(1)).rejects.toThrow('This document is closed')
})

test('rejects a document PDFium cannot parse', async () => {
  await expect(engine.open(new TextEncoder().encode('not a pdf'))).rejects.toThrow(
    /FPDF_GetLastError/,
  )
})
