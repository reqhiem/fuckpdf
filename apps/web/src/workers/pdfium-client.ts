/**
 * Main-thread handle on the PDFium worker. The worker is spawned on first use, so the
 * shell never pays for it, and PDF bytes are transferred rather than cloned (PRD NFR-3):
 * `open` detaches the ArrayBuffer you hand it.
 *
 * Nothing runtime from `@fuckpdf/engine-pdfium` may be imported here — that would drag
 * the wasm glue into the shell bundle (AGENTS.md invariant 6). Types only.
 */
import * as Comlink from 'comlink'
import type { PdfiumWorkerApi } from './pdfium.worker'

let remote: Comlink.Remote<PdfiumWorkerApi> | undefined

const worker = (): Comlink.Remote<PdfiumWorkerApi> => {
  remote ??= Comlink.wrap<PdfiumWorkerApi>(
    new Worker(new URL('./pdfium.worker.ts', import.meta.url), { type: 'module', name: 'pdfium' }),
  )
  return remote
}

export type PdfPage = { width: number; height: number; data: Uint8Array }

export type PdfDocument = {
  readonly pageCount: number
  /** Page size in PDF points. */
  pageSize(page: number): Promise<{ width: number; height: number }>
  /** Raw RGBA pixels, `width * height * 4` bytes. */
  render(page: number, dpi: number): Promise<PdfPage>
  /** PNG for an `<img>`, rendered at `dpi`. */
  thumbnail(page: number, dpi: number): Promise<Blob>
  extractText(page: number): Promise<string>
  close(): Promise<void>
}

/** Takes ownership of `bytes`: the ArrayBuffer is detached. Close the result. */
export async function openPdf(bytes: ArrayBuffer, password?: string): Promise<PdfDocument> {
  const api = worker()
  const { id, pageCount } = await api.open(Comlink.transfer(bytes, [bytes]), password)

  return {
    pageCount,
    pageSize: (page) => api.pageSize(id, page),
    extractText: (page) => api.extractText(id, page),
    thumbnail: (page, dpi) => api.thumbnail(id, page, dpi),
    async render(page, dpi) {
      const { width, height, buffer } = await api.render(id, page, dpi)
      return { width, height, data: new Uint8Array(buffer) }
    },
    close: () => api.close(id),
  }
}

/** Opens, runs, and closes even when `fn` throws. */
export async function withPdf<T>(
  bytes: ArrayBuffer,
  fn: (doc: PdfDocument) => Promise<T>,
  password?: string,
): Promise<T> {
  const doc = await openPdf(bytes, password)
  try {
    return await fn(doc)
  } finally {
    await doc.close()
  }
}

/** One-shot thumbnail. Detaches `bytes`; for a whole grid keep one `openPdf` handle. */
export function renderThumbnail(
  bytes: ArrayBuffer,
  page: number,
  dpi: number,
  password?: string,
): Promise<Blob> {
  return withPdf(bytes, (doc) => doc.thumbnail(page, dpi), password)
}

/** Transfers when the view owns its whole buffer, copies when it is a slice of a bigger
 * one — transferring that would detach bytes the caller still needs. */
const ownBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : (bytes.slice().buffer as ArrayBuffer)

/**
 * RGBA pixels → JPEG, PNG or WebP bytes, encoded in the worker via OffscreenCanvas.
 *
 * Shaped to be handed straight to a tool step: `format` is a plain `string` (unknown
 * values throw) because that is what `pdf-to-jpg`'s optional `encode` option declares,
 * and crop's flatten path takes the same. `quality` is optional and PNG ignores it.
 *
 * Detaches `rgba` when it owns its buffer — it is the render output, nobody reads it
 * twice, and copying a page of pixels for nothing is what NFR-3 is about.
 */
export async function encode(
  rgba: Uint8Array,
  width: number,
  height: number,
  format: string,
  quality?: number,
): Promise<Uint8Array> {
  const buffer = ownBuffer(rgba)
  const encoded = await worker().encode(
    Comlink.transfer(buffer, [buffer]),
    width,
    height,
    format,
    quality,
  )
  return new Uint8Array(encoded)
}

/** Comlink rebuilds a plain `Error` across the boundary, so the class is gone but the
 * name survives. Matches `PdfiumPasswordError` — the prompt-for-password case (FR-5). */
export const isPasswordError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'PdfiumPasswordError'
