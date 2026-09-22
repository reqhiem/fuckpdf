// Types only from `@fuckpdf/engine-pdfium`: a runtime import drags the wasm glue into
// the shell bundle.
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
  /** PDF points. */
  pageSize(page: number): Promise<{ width: number; height: number }>
  /** RGBA, `width * height * 4` bytes. */
  render(page: number, dpi: number): Promise<PdfPage>
  thumbnail(page: number, dpi: number): Promise<Blob>
  extractText(page: number): Promise<string>
  close(): Promise<void>
}

/** Detaches `bytes`. Close the result. */
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

/** Detaches `bytes`. For a whole grid keep one `openPdf` handle instead. */
export function renderThumbnail(
  bytes: ArrayBuffer,
  page: number,
  dpi: number,
  password?: string,
): Promise<Blob> {
  return withPdf(bytes, (doc) => doc.thumbnail(page, dpi), password)
}

/** Copies a slice rather than transferring it: the caller still owns the wider buffer. */
const ownBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : (bytes.slice().buffer as ArrayBuffer)

/** Detaches `rgba` when it owns its buffer. `format` is a plain string because that is
 * what a tool step's `encode` option declares; an unknown one throws. */
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

/** Comlink rebuilds a plain `Error` across the boundary: the class is gone, the name survives. */
export const isPasswordError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'PdfiumPasswordError'
