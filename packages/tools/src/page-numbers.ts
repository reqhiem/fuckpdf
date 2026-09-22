import { rgb, StandardFonts } from 'pdf-lib'
import type { Output, PdfInput, RunContext, ToolStep } from './types'
import { checkCancel, generateOutputName, loadPdf, parsePageRange } from './utils'

export type PositionAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type PageNumbersOptions = {
  position: PositionAnchor
  firstNumber: number
  pages?: string
  format: string // e.g. "Page {n} of {total}"
  font: 'Helvetica' | 'Times-Roman'
  size: number
  /** `rrggbb`, no leading `#`. */
  color: string
  margin: number
}

export const defaultOptions: PageNumbersOptions = {
  position: 'bottom-center',
  firstNumber: 1,
  format: '{n}',
  font: 'Helvetica',
  size: 12,
  color: '000000',
  margin: 20,
}

export const inputs = { min: 1, max: 1 }
export const accept = ['application/pdf']

function parseHex(hex: string) {
  const r = parseInt(hex.slice(0, 2), 16) / 255 || 0
  const g = parseInt(hex.slice(2, 4), 16) / 255 || 0
  const b = parseInt(hex.slice(4, 6), 16) / 255 || 0
  return rgb(r, g, b)
}

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as PageNumbersOptions
  const input = inputsList[0]
  if (!input) return []
  checkCancel(ctx)

  const pdf = await loadPdf(input.bytes, input.password)
  const totalPages = pdf.getPageCount()
  const toNumber = new Set(parsePageRange(options.pages || '', totalPages))

  const font = await pdf.embedFont(
    options.font === 'Times-Roman' ? StandardFonts.TimesRoman : StandardFonts.Helvetica,
  )
  const color = parseHex(options.color)

  const pages = pdf.getPages()
  let currentNumber = options.firstNumber

  for (let i = 0; i < pages.length; i++) {
    checkCancel(ctx)
    if (toNumber.has(i)) {
      const page = pages[i]
      if (!page) continue
      const text = options.format
        .replace('{n}', String(currentNumber))
        .replace('{total}', String(totalPages))
      const textWidth = font.widthOfTextAtSize(text, options.size)
      const textHeight = font.heightAtSize(options.size)

      const { width, height } = page.getSize()
      let x = 0
      let y = 0

      switch (options.position) {
        case 'top-left':
          x = options.margin
          y = height - options.margin - textHeight
          break
        case 'top-center':
          x = (width - textWidth) / 2
          y = height - options.margin - textHeight
          break
        case 'top-right':
          x = width - options.margin - textWidth
          y = height - options.margin - textHeight
          break
        case 'middle-left':
          x = options.margin
          y = (height - textHeight) / 2
          break
        case 'middle-center':
          x = (width - textWidth) / 2
          y = (height - textHeight) / 2
          break
        case 'middle-right':
          x = width - options.margin - textWidth
          y = (height - textHeight) / 2
          break
        case 'bottom-left':
          x = options.margin
          y = options.margin
          break
        case 'bottom-center':
          x = (width - textWidth) / 2
          y = options.margin
          break
        case 'bottom-right':
          x = width - options.margin - textWidth
          y = options.margin
          break
      }

      page.drawText(text, { x, y, size: options.size, font, color })
      currentNumber++
    }
    ctx?.onProgress?.({ value: i / pages.length, stage: 'page' })
  }

  ctx?.onProgress?.({ value: 1, stage: 'done' })
  return [
    {
      name: generateOutputName(input.name, 'page-numbers'),
      bytes: await pdf.save(),
      mime: 'application/pdf',
    },
  ]
}
