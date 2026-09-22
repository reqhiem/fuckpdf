import { PDFDocument } from 'pdf-lib'
import {
  type Output,
  PasswordRequiredError,
  type PdfInput,
  type RunContext,
  type ToolStep,
} from './types'
import { checkCancel, generateOutputName, loadPdf, parsePageRange } from './utils'

export type MergeOptions = {
  /** File names in output order. A name that is not among the inputs is ignored. */
  order?: string[]
  /** File name to 1-based page range. Absent means every page. */
  ranges?: Record<string, string>
}

export const defaultOptions: MergeOptions = {}
export const inputs = { min: 2, max: 1000 }
export const accept = ['application/pdf']

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as MergeOptions
  const mergedPdf = await PDFDocument.create()
  const order =
    options.order && options.order.length > 0 ? options.order : inputsList.map((i) => i.name)

  let totalProcessed = 0

  for (const name of order) {
    checkCancel(ctx)
    const input = inputsList.find((i) => i.name === name)
    if (!input) continue

    ctx?.onProgress?.({ value: totalProcessed / order.length, stage: 'file' })

    let pdf: PDFDocument
    try {
      pdf = await loadPdf(input.bytes, input.password)
    } catch (err: unknown) {
      if (err instanceof PasswordRequiredError) throw new PasswordRequiredError(input.name)
      throw err
    }

    const rangeStr = options.ranges?.[name] || ''
    const pagesToCopy = parsePageRange(rangeStr, pdf.getPageCount())

    const copiedPages = await mergedPdf.copyPages(pdf, pagesToCopy)
    for (const page of copiedPages) {
      mergedPdf.addPage(page)
    }

    totalProcessed++
  }

  ctx?.onProgress?.({ value: 1, stage: 'done' })
  const mergedBytes = await mergedPdf.save()

  return [
    {
      name: generateOutputName(inputsList[0]?.name || 'merged', 'merge'),
      bytes: mergedBytes,
      mime: 'application/pdf',
    },
  ]
}
