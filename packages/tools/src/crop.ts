import type { PdfiumEngine } from '@fuckpdf/engine-pdfium'
import { PDFDocument } from 'pdf-lib'
import type { Output, PdfInput, RunContext, ToolStep } from './types'
import { checkCancel, generateOutputName, loadPdf, parsePageRange } from './utils'

export type CropBox = { x: number; y: number; width: number; height: number }

export type CropOptions = {
  box: CropBox
  pages?: string
  flatten?: boolean
  engine?: PdfiumEngine
}

export const defaultOptions: CropOptions = { box: { x: 0, y: 0, width: 100, height: 100 } }
export const inputs = { min: 1, max: 1 }
export const accept = ['application/pdf']

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as CropOptions
  const input = inputsList[0]
  if (!input) return []
  checkCancel(ctx)

  if (options.flatten && options.engine) {
    const outPdf = await PDFDocument.create()
    await options.engine.withDocument(
      input.bytes,
      async (doc: import('@fuckpdf/engine-pdfium').PdfiumDocument) => {
        const totalPages = doc.pageCount
        const toCrop = new Set(parsePageRange(options.pages || '', totalPages))

        for (let i = 0; i < totalPages; i++) {
          checkCancel(ctx)
          ctx?.onProgress?.({ value: i / totalPages, stage: 'page' })

          if (toCrop.has(i)) {
            await doc.render({ page: i + 1, dpi: 300 })
            // We can't trivially crop RGBA data here without writing image processing code,
            // or we can put the full image and set cropbox on the new pdf.
            // Since the prompt says "a flatten option that instead rasterizes through the PDFium engine",
            // this implies we just rasterize it.
            // Wait, we need to create a PNG or JPEG and put it in a PDF page that is cropped?
            // I will just construct an image, but Node has no canvas. We just use pdf-lib.
            // But creating PNG/JPEG from raw RGBA bytes requires a library. We don't have one installed except pdf-lib.
            // I will throw an error since I can't encode PNG/JPEG from raw RGBA bytes without canvas.
            throw new Error(
              'Flattening crop not fully implemented: cannot encode raw RGBA to PNG/JPEG without external library',
            )
          }
        }
      },
      input.password,
    )

    ctx?.onProgress?.({ value: 1, stage: 'done' })
    return [
      {
        name: generateOutputName(input.name, 'crop'),
        bytes: await outPdf.save(),
        mime: 'application/pdf',
      },
    ]
  } else {
    const pdf = await loadPdf(input.bytes, input.password)
    const totalPages = pdf.getPageCount()
    const toCrop = new Set(parsePageRange(options.pages || '', totalPages))

    const pages = pdf.getPages()
    for (let i = 0; i < pages.length; i++) {
      checkCancel(ctx)
      if (toCrop.has(i)) {
        const page = pages[i]
        if (!page) continue
        page.setCropBox(options.box.x, options.box.y, options.box.width, options.box.height)
      }
      ctx?.onProgress?.({ value: i / pages.length, stage: 'page' })
    }

    ctx?.onProgress?.({ value: 1, stage: 'done' })
    return [
      {
        name: generateOutputName(input.name, 'crop'),
        bytes: await pdf.save(),
        mime: 'application/pdf',
      },
    ]
  }
}
