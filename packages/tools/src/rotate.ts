import { degrees } from 'pdf-lib'
import type { Output, PdfInput, RunContext, ToolStep } from './types'
import { checkCancel, generateOutputName, loadPdf, parsePageRange } from './utils'

export type RotateOptions = {
  angle: number
  /** 1-based, e.g. `"1-5, 8"`. Empty means every page. */
  pages?: string
}

export const defaultOptions: RotateOptions = { angle: 90 }
export const inputs = { min: 1, max: 1 }
export const accept = ['application/pdf']

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as RotateOptions
  const input = inputsList[0]
  if (!input) return []
  checkCancel(ctx)

  const pdf = await loadPdf(input.bytes, input.password)
  const totalPages = pdf.getPageCount()
  const toRotate = new Set(parsePageRange(options.pages || '', totalPages))

  const pages = pdf.getPages()
  for (let i = 0; i < pages.length; i++) {
    checkCancel(ctx)
    if (toRotate.has(i)) {
      const page = pages[i]
      if (!page) continue
      const current = page.getRotation().angle
      page.setRotation(degrees(current + options.angle))
    }
    ctx?.onProgress?.({ value: i / pages.length, stage: 'page' })
  }

  ctx?.onProgress?.({ value: 1, stage: 'done' })
  return [
    {
      name: generateOutputName(input.name, 'rotate'),
      bytes: await pdf.save(),
      mime: 'application/pdf',
    },
  ]
}
