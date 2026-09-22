import { degrees, rgb, StandardFonts } from 'pdf-lib'
import type { Output, PdfInput, RunContext, ToolStep } from './types'
import { checkCancel, generateOutputName, loadPdf, parsePageRange } from './utils'

export type WatermarkOptions = {
  type: 'text' | 'image'
  text?: string
  imageBytes?: Uint8Array
  imageMime?: string

  mode: 'positioned' | 'tiled'
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

  opacity: number
  rotation: number
  layer: 'over' | 'under'
  pages?: string

  color?: string // hex
  size?: number
}

export const defaultOptions: WatermarkOptions = {
  type: 'text',
  text: 'WATERMARK',
  mode: 'positioned',
  position: 'center',
  opacity: 0.5,
  rotation: 45,
  layer: 'over',
  color: '000000',
  size: 48,
}

export const inputs = { min: 1, max: 1 }
export const accept = ['application/pdf']

function parseHex(hex: string) {
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255 || 0
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255 || 0
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255 || 0
  return rgb(r, g, b)
}

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as WatermarkOptions
  const input = inputsList[0]
  if (!input) return []
  checkCancel(ctx)

  const pdf = await loadPdf(input.bytes, input.password)
  const totalPages = pdf.getPageCount()
  const toWatermark = new Set(parsePageRange(options.pages || '', totalPages))

  let font: import('pdf-lib').PDFFont | null = null
  let color: import('pdf-lib').Color | null = null
  let pdfImage: import('pdf-lib').PDFImage | null = null
  let elementWidth = 0
  let elementHeight = 0

  if (options.type === 'text' && options.text) {
    font = await pdf.embedFont(StandardFonts.Helvetica)
    color = parseHex(options.color || '000000')
    const size = options.size || 48
    elementWidth = font.widthOfTextAtSize(options.text, size)
    elementHeight = font.heightAtSize(size)
  } else if (options.type === 'image' && options.imageBytes) {
    if (options.imageMime === 'image/png') {
      pdfImage = await pdf.embedPng(options.imageBytes)
    } else {
      pdfImage = await pdf.embedJpg(options.imageBytes)
    }
    elementWidth = pdfImage.width
    elementHeight = pdfImage.height
  }

  const pages = pdf.getPages()
  for (let i = 0; i < pages.length; i++) {
    checkCancel(ctx)
    if (toWatermark.has(i)) {
      const page = pages[i]
      if (!page) continue
      const { width, height } = page.getSize()

      const draw = (x: number, y: number) => {
        const drawOpts = {
          x,
          y,
          opacity: options.opacity,
          rotate: degrees(options.rotation),
        }

        if (options.type === 'text' && options.text && font && color) {
          page.drawText(options.text, {
            ...drawOpts,
            size: options.size || 48,
            font,
            color,
          })
        } else if (pdfImage) {
          page.drawImage(pdfImage, {
            ...drawOpts,
            width: elementWidth,
            height: elementHeight,
          })
        }
      }

      if (options.mode === 'positioned') {
        let x = (width - elementWidth) / 2
        let y = (height - elementHeight) / 2
        if (options.position === 'top-left') {
          x = 0
          y = height - elementHeight
        }
        if (options.position === 'top-right') {
          x = width - elementWidth
          y = height - elementHeight
        }
        if (options.position === 'bottom-left') {
          x = 0
          y = 0
        }
        if (options.position === 'bottom-right') {
          x = width - elementWidth
          y = 0
        }

        draw(x, y)
      } else {
        const stepX = elementWidth * 1.5
        const stepY = elementHeight * 1.5
        for (let x = -width; x < width * 2; x += stepX) {
          for (let y = -height; y < height * 2; y += stepY) {
            draw(x, y)
          }
        }
      }
    }
    ctx?.onProgress?.({ value: i / pages.length, stage: 'page' })
  }

  ctx?.onProgress?.({ value: 1, stage: 'done' })
  return [
    {
      name: generateOutputName(input.name, 'watermark'),
      bytes: await pdf.save(),
      mime: 'application/pdf',
    },
  ]
}
