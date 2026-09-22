import { withPdf } from '../../workers/pdfium-client'

export type Thumb = { url: string; pages: number | undefined }

/** White is page stock (DESIGN.md): text on the sheet is ink, `text-muted` fails there. */
export const SHEET = 'bg-white shadow-[0_1px_3px_rgb(0_0_0/0.18)] ring-1 ring-ink/15'

export const isImage = (type: string) => type.startsWith('image/')

export const renderPdfBytes = (bytes: ArrayBuffer, dpi: number): Promise<Thumb> =>
  withPdf(bytes, async (doc) => ({
    url: URL.createObjectURL(await doc.thumbnail(1, dpi)),
    pages: doc.pageCount,
  }))

export const renderFile = async (file: File, dpi: number): Promise<Thumb> =>
  isImage(file.type)
    ? { url: URL.createObjectURL(file), pages: undefined }
    : renderPdfBytes(await file.arrayBuffer(), dpi)
