/// <reference lib="webworker" />

// Documents stay open here and are addressed by id, so a grid transfers its bytes once
// rather than once per page.
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

/** The buffer is freshly allocated and unreferenced, so it can be transferred. */
const pixels = async (id: number, page: number, dpi: number) => {
  const { width, height, data } = await get(id).render({ page, dpi })
  return { width, height, buffer: data.buffer as ArrayBuffer }
}

const MIME: Record<string, string | undefined> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** OffscreenCanvas is the only encoder a worker has. PNG ignores `quality`. */
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

  pageSize(id: number, page: number): Promise<{ width: number; height: number }> {
    return get(id).pageSize(page)
  },

  extractText(id: number, page: number): Promise<string> {
    return get(id).extractText(page)
  },

  async render(id: number, page: number, dpi: number) {
    const { width, height, buffer } = await pixels(id, page, dpi)
    return Comlink.transfer({ width, height, buffer }, [buffer])
  },

  /** PNG. The Blob crosses by reference, not by copy. */
  async thumbnail(id: number, page: number, dpi: number): Promise<Blob> {
    const { width, height, buffer } = await pixels(id, page, dpi)
    return toBlob(buffer, width, height, 'image/png')
  },

  /** Lives here so `packages/tools` stays DOM-free and pixels never reach the main thread. */
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
