/// <reference lib="webworker" />

/**
 * The only place PDF bytes are decoded (AGENTS.md invariant 3). Documents are kept open
 * here and addressed by id, so a page grid transfers its bytes once instead of once per
 * page (PRD NFR-3).
 */
import { createPdfiumEngine, type PdfiumDocument } from '@fuckpdf/engine-pdfium'
import { loadPdfiumWasm } from '@fuckpdf/engine-pdfium/wasm'
import * as Comlink from 'comlink'

const engine = createPdfiumEngine(loadPdfiumWasm)
const documents = new Map<number, PdfiumDocument>()
let nextId = 1

const get = (id: number): PdfiumDocument => {
  const doc = documents.get(id)
  if (!doc) throw new Error(`Document ${id} is not open`)
  return doc
}

/** `render` hands back a freshly allocated buffer it no longer references, so the bytes
 * can be transferred instead of copied. */
const pixels = async (id: number, page: number, dpi: number) => {
  const { width, height, data } = await get(id).render({ page, dpi })
  return { width, height, buffer: data.buffer as ArrayBuffer }
}

const MIME: Record<string, string | undefined> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** OffscreenCanvas is the only encoder a worker has; `quality` is ignored for PNG. */
const toBlob = async (
  rgba: ArrayBuffer,
  width: number,
  height: number,
  type: string,
  quality?: number,
): Promise<Blob> => {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser refused a 2D canvas in a worker')
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0)
  return canvas.convertToBlob(quality === undefined ? { type } : { type, quality })
}

const api = {
  async open(bytes: ArrayBuffer, password?: string): Promise<{ id: number; pageCount: number }> {
    const doc = await engine.open(new Uint8Array(bytes), password)
    const id = nextId++
    documents.set(id, doc)
    return { id, pageCount: doc.pageCount }
  },

  close(id: number): void {
    documents.get(id)?.close()
    documents.delete(id)
  },

  pageSize(id: number, page: number): { width: number; height: number } {
    return get(id).pageSize(page)
  },

  extractText(id: number, page: number): Promise<string> {
    return get(id).extractText(page)
  },

  /** Raw RGBA. */
  async render(id: number, page: number, dpi: number) {
    const { width, height, buffer } = await pixels(id, page, dpi)
    return Comlink.transfer({ width, height, buffer }, [buffer])
  },

  /** PNG, ready for `URL.createObjectURL` in an `<img>`. Encoding stays off the main
   * thread; the Blob itself crosses by reference, not by copy. */
  async thumbnail(id: number, page: number, dpi: number): Promise<Blob> {
    const { width, height, buffer } = await pixels(id, page, dpi)
    return toBlob(buffer, width, height, 'image/png')
  },

  /** RGBA in, encoded image bytes out. Lives here so `packages/tools` can stay DOM-free
   * (AGENTS.md invariant 5) and pixels never reach the main thread (invariant 3):
   * `pdf-to-jpg` and crop's flatten path both take this as their `encode` option. */
  async encode(
    rgba: ArrayBuffer,
    width: number,
    height: number,
    format: string,
    quality?: number,
  ): Promise<ArrayBuffer> {
    const mime = MIME[format]
    if (!mime) throw new Error(`Unsupported image format: ${format}`)
    const blob = await toBlob(rgba, width, height, mime, quality)
    const encoded = await blob.arrayBuffer()
    return Comlink.transfer(encoded, [encoded])
  },
}

export type PdfiumWorkerApi = typeof api

Comlink.expose(api)
