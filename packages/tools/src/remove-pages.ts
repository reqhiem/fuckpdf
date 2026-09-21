import type { Output, PdfInput, RunContext, ToolStep } from './types'
import { checkCancel, generateOutputName, loadPdf, parsePageRange } from './utils'

export type RemovePagesOptions = {
  /** Page selection string, e.g. "1-5, 8" */
  pages: string
}

export const defaultOptions: RemovePagesOptions = { pages: '' }
export const inputs = { min: 1, max: 1 }
export const accept = ['application/pdf']

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as RemovePagesOptions
  const input = inputsList[0]
  if (!input) return []
  checkCancel(ctx)

  const pdf = await loadPdf(input.bytes, input.password)
  const totalPages = pdf.getPageCount()
  const toRemove = new Set(parsePageRange(options.pages, totalPages))

  // Remove in reverse order so indices don't shift
  for (let i = totalPages - 1; i >= 0; i--) {
    checkCancel(ctx)
    if (toRemove.has(i)) {
      pdf.removePage(i)
    }
    ctx?.onProgress?.({ value: (totalPages - i) / totalPages, stage: 'page' })
  }

  ctx?.onProgress?.({ value: 1, stage: 'done' })
  const bytes = await pdf.save()

  return [
    {
      name: generateOutputName(input.name, 'remove'),
      bytes,
      mime: 'application/pdf',
    },
  ]
}
