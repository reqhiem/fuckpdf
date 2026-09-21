/**
 * PDFium adapter contract.
 *
 * PDFium is the only renderer in this codebase (AGENTS.md invariant 4). The adapter
 * exists because wasm instantiation, document lifetime and memory release are easy to
 * get wrong, not to abstract over a second engine — there is none.
 *
 * Every document must be closed. Callers use `withDocument` unless they have a reason.
 */

export type RenderOptions = {
  /** 1-based. */
  page: number
  /** Target DPI; 72 is PDF user-space 1:1. PRD §5.2 allows 72–300. */
  dpi: number
}

export type RenderedPage = {
  width: number
  height: number
  /** RGBA, `width * height * 4` bytes. */
  data: Uint8Array
}

export type PdfiumDocument = {
  readonly pageCount: number
  /** Page size in PDF points, 1-based index. */
  pageSize(page: number): { width: number; height: number }
  render(options: RenderOptions): Promise<RenderedPage>
  extractText(page: number): Promise<string>
  close(): void
}

export type PdfiumEngine = {
  open(bytes: Uint8Array, password?: string): Promise<PdfiumDocument>
  /** Opens, runs, and closes even when `fn` throws. */
  withDocument<T>(
    bytes: Uint8Array,
    fn: (doc: PdfiumDocument) => Promise<T>,
    password?: string,
  ): Promise<T>
}

export class PdfiumPasswordError extends Error {
  constructor() {
    super('PDF is password-protected')
    this.name = 'PdfiumPasswordError'
  }
}
