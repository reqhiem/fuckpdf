import {
  BlendMode,
  type Color,
  LineCapStyle,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
} from 'pdf-lib'
import {
  type EditElement,
  type EditFont,
  type EditOptions,
  TEXT_ASCENT,
  TEXT_LINE_HEIGHT,
} from './edit-types'
import type { Output, PdfInput, RunContext, ToolStep } from './types'
import { checkCancel, generateOutputName, loadPdf } from './utils'

export const defaultOptions: EditOptions = { elements: [] }

export const inputs = { min: 1, max: 1 }
export const accept = ['application/pdf']

const STANDARD_FONT: Record<EditFont, StandardFonts> = {
  helvetica: StandardFonts.Helvetica,
  times: StandardFonts.TimesRoman,
  courier: StandardFonts.Courier,
}

/** `|| 0` rather than a throw: NaN in a content stream is a PDF no reader will open. */
function parseHex(hex: string): Color {
  const h = hex.startsWith('#') ? hex.slice(1) : hex
  const r = Number.parseInt(h.slice(0, 2), 16) / 255 || 0
  const g = Number.parseInt(h.slice(2, 4), 16) / 255 || 0
  const b = Number.parseInt(h.slice(4, 6), 16) / 255 || 0
  return rgb(r, g, b)
}

type Paint = { color?: Color; borderColor?: Color; borderWidth?: number }

/** Null when a shape has neither fill nor stroke: pdf-lib would fill it black. */
function paintOf(el: { fill?: string; stroke?: string; strokeWidth?: number }): Paint | null {
  const paint: Paint = {}
  if (el.fill) paint.color = parseHex(el.fill)
  if (el.stroke) {
    paint.borderColor = parseHex(el.stroke)
    paint.borderWidth = el.strokeWidth ?? 1
  }
  return paint.color || paint.borderColor ? paint : null
}

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as EditOptions
  const input = inputsList[0]
  if (!input) return []
  checkCancel(ctx)

  const pdf = await loadPdf(input.bytes, input.password)
  const pages = pdf.getPages()

  const byPage = new Map<number, EditElement[]>()
  for (const el of options.elements ?? []) {
    const index = el.page - 1
    if (!Number.isInteger(index) || index < 0 || index >= pages.length) continue
    const list = byPage.get(index)
    if (list) list.push(el)
    else byPage.set(index, [el])
  }

  const fonts = new Map<EditFont, PDFFont>()
  const embedFont = async (name: EditFont): Promise<PDFFont> => {
    const cached = fonts.get(name)
    if (cached) return cached
    const embedded = await pdf.embedFont(STANDARD_FONT[name] ?? StandardFonts.Helvetica)
    fonts.set(name, embedded)
    return embedded
  }

  const draw = async (page: PDFPage, h: number, el: EditElement) => {
    const opacity = el.opacity ?? 1
    switch (el.type) {
      case 'text': {
        const font = await embedFont(el.font)
        const color = parseHex(el.color)
        for (const [i, line] of el.text.split('\n').entries()) {
          page.drawText(line, {
            x: el.x,
            y: h - (el.y + el.size * TEXT_ASCENT + i * el.size * TEXT_LINE_HEIGHT),
            size: el.size,
            font,
            color,
            opacity,
          })
        }
        break
      }
      case 'image': {
        const image =
          el.mime === 'image/png' ? await pdf.embedPng(el.bytes) : await pdf.embedJpg(el.bytes)
        page.drawImage(image, {
          x: el.x,
          y: h - el.y - el.height,
          width: el.width,
          height: el.height,
          opacity,
        })
        break
      }
      case 'rect': {
        const paint = paintOf(el)
        if (!paint) break
        page.drawRectangle({
          x: el.x,
          y: h - el.y - el.height,
          width: el.width,
          height: el.height,
          opacity,
          borderOpacity: opacity,
          ...paint,
        })
        break
      }
      case 'ellipse': {
        const paint = paintOf(el)
        if (!paint) break
        page.drawEllipse({
          x: el.x + el.width / 2,
          y: h - (el.y + el.height / 2),
          xScale: el.width / 2,
          yScale: el.height / 2,
          opacity,
          borderOpacity: opacity,
          ...paint,
        })
        break
      }
      case 'line':
        page.drawLine({
          start: { x: el.x, y: h - el.y },
          end: { x: el.x2, y: h - el.y2 },
          thickness: el.strokeWidth,
          color: parseHex(el.stroke),
          opacity,
        })
        break
      case 'ink': {
        const color = parseHex(el.stroke)
        for (let i = 0; i + 3 < el.points.length; i += 2) {
          const [x1, y1, x2, y2] = el.points.slice(i, i + 4) as [number, number, number, number]
          page.drawLine({
            start: { x: x1, y: h - y1 },
            end: { x: x2, y: h - y2 },
            thickness: el.strokeWidth,
            color,
            opacity,
            lineCap: LineCapStyle.Round,
          })
        }
        break
      }
      case 'highlight':
        page.drawRectangle({
          x: el.x,
          y: h - el.y - el.height,
          width: el.width,
          height: el.height,
          color: parseHex(el.color),
          opacity: el.opacity ?? 0.4,
          blendMode: BlendMode.Multiply,
        })
        break
    }
  }

  for (let i = 0; i < pages.length; i++) {
    checkCancel(ctx)
    const page = pages[i]
    const elements = byPage.get(i)
    if (page && elements) {
      const { height } = page.getSize()
      for (const el of elements) await draw(page, height, el)
    }
    ctx?.onProgress?.({ value: i / pages.length, stage: 'page' })
  }

  ctx?.onProgress?.({ value: 1, stage: 'done' })
  return [
    {
      name: generateOutputName(input.name, 'edit'),
      bytes: await pdf.save(),
      mime: 'application/pdf',
    },
  ]
}
