import { PDFDocument } from 'pdf-lib'
import type { Output, PdfInput, RunContext, ToolStep } from './types'
import {
  checkCancel,
  generateOutputName,
  generateZipName,
  loadPdf,
  makeZip,
  parsePageRange,
} from './utils'

export type ExtractPagesOptions = {
  /** 1-based, e.g. `"1-5, 8"`. */
  pages: string
  split?: boolean
}

export const defaultOptions: ExtractPagesOptions = { pages: '' }
export const inputs = { min: 1, max: 1 }
export const accept = ['application/pdf']

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as ExtractPagesOptions
  const input = inputsList[0]
  if (!input) return []
  checkCancel(ctx)

  const pdf = await loadPdf(input.bytes, input.password)
  const totalPages = pdf.getPageCount()
  const toExtract = parsePageRange(options.pages, totalPages)

  if (toExtract.length === 0) return []

  if (options.split) {
    const files: Record<string, Uint8Array> = {}
    for (let i = 0; i < toExtract.length; i++) {
      checkCancel(ctx)
      const pageIndex = toExtract[i]
      if (pageIndex === undefined) continue
      ctx?.onProgress?.({ value: i / toExtract.length, stage: 'page' })

      const newPdf = await PDFDocument.create()
      const [copiedPage] = await newPdf.copyPages(pdf, [pageIndex])
      newPdf.addPage(copiedPage as import('pdf-lib').PDFPage)

      const name = `${input.name.replace(/\.[^/.]+$/, '')}-page-${pageIndex + 1}.pdf`
      files[name] = await newPdf.save()
    }

    ctx?.onProgress?.({ value: 1, stage: 'done' })
    return [
      {
        name: generateZipName('extract'),
        bytes: makeZip(files),
        mime: 'application/zip',
      },
    ]
  } else {
    const newPdf = await PDFDocument.create()
    for (let i = 0; i < toExtract.length; i++) {
      checkCancel(ctx)
      ctx?.onProgress?.({ value: i / toExtract.length, stage: 'page' })
      const [copiedPage] = await newPdf.copyPages(pdf, [toExtract[i] || 0])
      newPdf.addPage(copiedPage as import('pdf-lib').PDFPage)
    }

    ctx?.onProgress?.({ value: 1, stage: 'done' })
    return [
      {
        name: generateOutputName(input.name, 'extract'),
        bytes: await newPdf.save(),
        mime: 'application/pdf',
      },
    ]
  }
}
