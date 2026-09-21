import { init, type PdfiumModule, type WrappedPdfiumModule } from '@embedpdf/pdfium'
import {
  type PdfiumDocument,
  type PdfiumEngine,
  PdfiumPasswordError,
  type RenderedPage,
  type RenderOptions,
} from './types'

/** Supplies the wasm bytes. Never a URL the engine picks: zero egress means the caller
 * decides where the binary comes from, and in the browser that is our own origin. */
export type WasmSource = BufferSource | (() => Promise<BufferSource>)

const FPDF_ERR_PASSWORD = 4
const FPDFBitmap_BGRA = 4
/** Render annotation appearances, like every other viewer does. */
const FPDF_ANNOT = 0x01
const POINTS_PER_INCH = 72

/** `PdfiumModule` resolves to `{}` here (its `@types/emscripten` base is not installed),
 * so the two runtime bits we need are re-declared instead of cast away with `any`. */
type Heap = { HEAPU8: Uint8Array }
type ModuleOverrides = Partial<PdfiumModule> & { wasmBinary: BufferSource }

/** Re-read on every use: the heap is replaced whenever wasm memory grows. */
const heap = (mod: WrappedPdfiumModule): Uint8Array => (mod.pdfium as unknown as Heap).HEAPU8

const malloc = (mod: WrappedPdfiumModule, size: number): number => {
  const ptr = mod.pdfium.wasmExports.malloc(size)
  if (!ptr) throw new Error(`PDFium is out of memory (wanted ${size} bytes)`)
  return ptr
}

function openDocument(
  mod: WrappedPdfiumModule,
  bytes: Uint8Array,
  password?: string,
): PdfiumDocument {
  const size = bytes.byteLength
  const bufPtr = malloc(mod, size)
  heap(mod).set(bytes, bufPtr)

  const docPtr = mod.FPDF_LoadMemDocument(bufPtr, size, password ?? '')
  if (!docPtr) {
    const code = mod.FPDF_GetLastError()
    mod.pdfium.wasmExports.free(bufPtr)
    if (code === FPDF_ERR_PASSWORD) throw new PdfiumPasswordError()
    throw new Error(`PDFium could not open this document (FPDF_GetLastError ${code})`)
  }

  // PDFium reads from `bufPtr` for the document's whole lifetime, so it is freed in close().
  const pageCount = mod.FPDF_GetPageCount(docPtr)
  let closed = false

  const assertOpen = () => {
    if (closed) throw new Error('This document is closed')
  }

  const assertPage = (page: number) => {
    assertOpen()
    if (!Number.isInteger(page) || page < 1 || page > pageCount) {
      throw new RangeError(`Page ${page} is out of range (1-${pageCount})`)
    }
  }

  /** Loads a page, runs `fn`, closes the page even when `fn` throws. */
  const withPage = <T>(page: number, fn: (pagePtr: number) => T): T => {
    assertPage(page)
    const pagePtr = mod.FPDF_LoadPage(docPtr, page - 1)
    if (!pagePtr) throw new Error(`PDFium could not load page ${page}`)
    try {
      return fn(pagePtr)
    } finally {
      mod.FPDF_ClosePage(pagePtr)
    }
  }

  return {
    pageCount,

    pageSize(page) {
      return withPage(page, (pagePtr) => ({
        width: mod.FPDF_GetPageWidthF(pagePtr),
        height: mod.FPDF_GetPageHeightF(pagePtr),
      }))
    },

    async render({ page, dpi }: RenderOptions): Promise<RenderedPage> {
      if (!(dpi > 0)) throw new RangeError(`DPI must be positive, got ${dpi}`)
      return withPage(page, (pagePtr) => {
        const scale = dpi / POINTS_PER_INCH
        const width = Math.max(1, Math.round(mod.FPDF_GetPageWidthF(pagePtr) * scale))
        const height = Math.max(1, Math.round(mod.FPDF_GetPageHeightF(pagePtr) * scale))

        const stride = width * 4
        const pixelPtr = malloc(mod, stride * height)
        const bitmap = mod.FPDFBitmap_CreateEx(width, height, FPDFBitmap_BGRA, pixelPtr, stride)
        if (!bitmap) {
          mod.pdfium.wasmExports.free(pixelPtr)
          throw new Error(`PDFium could not allocate a ${width}x${height} bitmap`)
        }
        try {
          // White, opaque: a PDF page is paper, not a transparent layer.
          mod.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xffffffff)
          mod.FPDF_RenderPageBitmap(bitmap, pagePtr, 0, 0, width, height, 0, FPDF_ANNOT)

          // PDFium writes BGRA; the contract is RGBA.
          const data = heap(mod).slice(pixelPtr, pixelPtr + stride * height)
          for (let i = 0; i < data.length; i += 4) {
            const b = data[i] as number
            data[i] = data[i + 2] as number
            data[i + 2] = b
          }
          return { width, height, data }
        } finally {
          mod.FPDFBitmap_Destroy(bitmap)
          mod.pdfium.wasmExports.free(pixelPtr)
        }
      })
    },

    async extractText(page) {
      return withPage(page, (pagePtr) => {
        const textPage = mod.FPDFText_LoadPage(pagePtr)
        if (!textPage) throw new Error(`PDFium could not read text on page ${page}`)
        try {
          const chars = mod.FPDFText_CountChars(textPage)
          if (chars <= 0) return ''
          // UTF-16, plus PDFium's NUL terminator.
          const outPtr = malloc(mod, (chars + 1) * 2)
          try {
            mod.FPDFText_GetText(textPage, 0, chars, outPtr)
            return mod.pdfium.UTF16ToString(outPtr)
          } finally {
            mod.pdfium.wasmExports.free(outPtr)
          }
        } finally {
          mod.FPDFText_ClosePage(textPage)
        }
      })
    },

    close() {
      if (closed) return
      closed = true
      mod.FPDF_CloseDocument(docPtr)
      mod.pdfium.wasmExports.free(bufPtr)
    },
  }
}

/**
 * The wasm module is instantiated at most once per engine and reused. `wasm` is only
 * touched on the first `open()`, so importing this module costs nothing.
 */
export function createPdfiumEngine(wasm: WasmSource): PdfiumEngine {
  let modulePromise: Promise<WrappedPdfiumModule> | undefined

  const load = async (): Promise<WrappedPdfiumModule> => {
    const wasmBinary = typeof wasm === 'function' ? await wasm() : wasm
    const mod = await init({ wasmBinary } satisfies ModuleOverrides)
    mod.PDFiumExt_Init()
    return mod
  }

  const engine: PdfiumEngine = {
    async open(bytes, password) {
      // Retry on the next call if instantiation failed, rather than caching the rejection.
      modulePromise ??= load().catch((error: unknown) => {
        modulePromise = undefined
        throw error
      })
      return openDocument(await modulePromise, bytes, password)
    },

    async withDocument(bytes, fn, password) {
      const doc = await engine.open(bytes, password)
      try {
        return await fn(doc)
      } finally {
        doc.close()
      }
    },
  }

  return engine
}
