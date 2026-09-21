/**
 * The `PdfiumEngine` the tool steps expect, backed by the worker rather than by an
 * in-process wasm module. Same contract, so a step cannot tell the difference — and the
 * main thread still never touches PDF bytes beyond transferring them (NFR-3).
 */
import type { PdfiumDocument, PdfiumEngine, RenderOptions } from '@fuckpdf/engine-pdfium'
import { encode, openPdf, type PdfDocument } from './pdfium-client'

const adapt = (doc: PdfDocument): PdfiumDocument => ({
  pageCount: doc.pageCount,
  pageSize: (page) => doc.pageSize(page),
  extractText: (page) => doc.extractText(page),
  render: ({ page, dpi }: RenderOptions) => doc.render(page, dpi),
  // The worker owns the document; closing is fire-and-forget because the contract is sync.
  close: () => {
    void doc.close()
  },
})

/** `bytes` is copied, not detached: a tool step may still hold the original view. */
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
