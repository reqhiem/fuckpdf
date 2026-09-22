import type { PdfiumDocument, PdfiumEngine, RenderOptions } from '@fuckpdf/engine-pdfium'
import { encode, openPdf, type PdfDocument } from './pdfium-client'

const adapt = (doc: PdfDocument): PdfiumDocument => ({
  pageCount: doc.pageCount,
  pageSize: (page) => doc.pageSize(page),
  extractText: (page) => doc.extractText(page),
  render: ({ page, dpi }: RenderOptions) => doc.render(page, dpi),
  // Fire and forget: the worker owns the document and the contract is synchronous.
  close: () => {
    void doc.close()
  },
})

// Copied, not detached: a tool step may still hold the original view.
const open = async (bytes: Uint8Array, password?: string) =>
  adapt(await openPdf(bytes.slice().buffer, password))

export const engine: PdfiumEngine = {
  open,
  async withDocument(bytes, fn, password) {
    const doc = await open(bytes, password)
    try {
      return await fn(doc)
    } finally {
      doc.close()
    }
  },
}

export { encode }
