// Pages are identified by width, not by text: width survives every copy, reorder and
// rotate path, so an assertion can state the exact page order of an output.
import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  type PDFRawStream,
  rgb,
  StandardFonts,
} from 'pdf-lib'

export async function createFixturePdf(): Promise<Buffer> {
  const document = await PDFDocument.create()
  const page = document.addPage([612, 792])
  const font = await document.embedFont(StandardFonts.Helvetica)

  page.drawText('fuckpdf test fixture', {
    x: 72,
    y: 720,
    font,
    size: 18,
    color: rgb(0, 0, 0),
  })

  return Buffer.from(await document.save())
}

/** Keep the widths distinct: a page is recognised later by its width. */
export async function createPagedPdf(widths: number[], height = 792): Promise<Buffer> {
  const document = await PDFDocument.create()
  const font = await document.embedFont(StandardFonts.Helvetica)

  widths.forEach((width, index) => {
    const page = document.addPage([width, height])
    page.drawText(`PAGE-${index + 1}`, {
      x: 20,
      y: height - 40,
      font,
      size: 14,
      color: rgb(0, 0, 0),
    })
  })

  return Buffer.from(await document.save())
}

export async function pageWidths(bytes: Buffer): Promise<number[]> {
  const document = await PDFDocument.load(bytes)
  return document.getPages().map((page) => Math.round(page.getSize().width))
}

export async function pageCount(bytes: Buffer): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount()
}

export type Box = { x: number; y: number; width: number; height: number }

export async function pageSizes(bytes: Buffer): Promise<Array<{ width: number; height: number }>> {
  const document = await PDFDocument.load(bytes)
  return document.getPages().map((page) => {
    const { width, height } = page.getSize()
    return { width: Math.round(width), height: Math.round(height) }
  })
}

export async function pageBoxes(bytes: Buffer, index: number): Promise<{ crop: Box; media: Box }> {
  const page = (await PDFDocument.load(bytes)).getPage(index)
  const round = (box: Box): Box => ({
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  })
  return { crop: round(page.getCropBox()), media: round(page.getMediaBox()) }
}

export async function pageRotations(bytes: Buffer): Promise<number[]> {
  const document = await PDFDocument.load(bytes)
  return document.getPages().map((page) => ((page.getRotation().angle % 360) + 360) % 360)
}

/** Decoded and with hex strings expanded, so `<32206F662033> Tj` reads as `2 of 3` and
 * the suite needs no PDF text extractor. */
export async function pageContent(bytes: Buffer, index: number): Promise<string> {
  const document = await PDFDocument.load(bytes)
  const contents = document.getPage(index).node.Contents()
  if (!contents) return ''

  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((ref) => document.context.lookup(ref) as PDFRawStream)
      : [contents as PDFRawStream]

  return expandHexStrings(
    streams
      .map((stream) => Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1'))
      .join('\n'),
  )
}

/** `<<` never matches, so dictionaries are left alone. */
const expandHexStrings = (stream: string): string =>
  stream.replace(/<([\dA-Fa-f\s]+)>/g, (match, hex: string) => {
    const digits = hex.replace(/\s/g, '')
    return digits.length % 2 === 0 ? Buffer.from(digits, 'hex').toString('latin1') : match
  })
