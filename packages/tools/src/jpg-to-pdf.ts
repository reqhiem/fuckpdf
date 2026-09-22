import { PDFDocument } from 'pdf-lib'
import type { Output, PdfInput, RunContext, ToolStep } from './types'
import { checkCancel, generateOutputName } from './utils'

export type JpgToPdfOptions = {
  pageSize: 'A4' | 'Letter' | 'fit-image'
  orientation: 'portrait' | 'landscape'
  margin: number
  fitMode: 'contain' | 'cover' | 'fill'
}

export const defaultOptions: JpgToPdfOptions = {
  pageSize: 'A4',
  orientation: 'portrait',
  margin: 0,
  fitMode: 'contain',
}

export const inputs = { min: 1, max: 1000 }
export const accept = ['image/jpeg', 'image/png']

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as JpgToPdfOptions
  if (!inputsList.length) return []
  checkCancel(ctx)

  const pdf = await PDFDocument.create()

  for (let i = 0; i < inputsList.length; i++) {
    checkCancel(ctx)
    ctx?.onProgress?.({ value: i / inputsList.length, stage: 'image' })
    const input = inputsList[i]
    if (!input) continue

    let image: import('pdf-lib').PDFImage
    if (input.name.toLowerCase().endsWith('.png')) {
      image = await pdf.embedPng(input.bytes)
    } else {
      image = await pdf.embedJpg(input.bytes)
    }

    let pageWidth = 0
    let pageHeight = 0

    if (options.pageSize === 'fit-image') {
      pageWidth = image.width + options.margin * 2
      pageHeight = image.height + options.margin * 2
    } else {
      const isA4 = options.pageSize === 'A4'
      const w = isA4 ? 595.28 : 612
      const h = isA4 ? 841.89 : 792
      if (options.orientation === 'landscape') {
        pageWidth = h
        pageHeight = w
      } else {
        pageWidth = w
        pageHeight = h
      }
    }

    const page = pdf.addPage([pageWidth, pageHeight])

    const availWidth = pageWidth - options.margin * 2
    const availHeight = pageHeight - options.margin * 2

    let drawWidth = availWidth
    let drawHeight = availHeight

    if (options.pageSize === 'fit-image' || options.fitMode === 'fill') {
      drawWidth = availWidth
      drawHeight = availHeight
    } else if (options.fitMode === 'contain') {
      const scale = Math.min(availWidth / image.width, availHeight / image.height)
      drawWidth = image.width * scale
      drawHeight = image.height * scale
    } else if (options.fitMode === 'cover') {
      const scale = Math.max(availWidth / image.width, availHeight / image.height)
      drawWidth = image.width * scale
      drawHeight = image.height * scale
    }

    const x = options.margin + (availWidth - drawWidth) / 2
    const y = options.margin + (availHeight - drawHeight) / 2

    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    })
  }

  ctx?.onProgress?.({ value: 1, stage: 'done' })
  const bytes = await pdf.save()

  return [
    {
      name: generateOutputName(inputsList[0]?.name || 'out', 'jpg-to-pdf'),
      bytes,
      mime: 'application/pdf',
    },
  ]
}
