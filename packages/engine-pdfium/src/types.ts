// Every document must be closed. Use `withDocument` unless you have a reason not to.

export type RenderOptions = {
  /** 1-based. */
  page: number
  /** 72 is PDF user space 1:1. */
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
  /** Async so a worker-backed engine satisfies the same contract as the in-process one. */
  pageSize(page: number): Promise<{ width: number; height: number }>
  render(options: RenderOptions): Promise<RenderedPage>
  extractText(page: number): Promise<string>
  close(): void
}

export type PdfiumEngine = {
  open(bytes: Uint8Array, password?: string): Promise<PdfiumDocument>
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
