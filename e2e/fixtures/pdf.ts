/**
 * PDF fixtures and read-back helpers for the E2E suite. Everything is generated at run
 * time — no binaries in the repo.
 *
 * Pages are identified by their *width*, not by their text: page width survives every
 * copy/reorder/rotate path pdf-lib takes, and pdf-lib can read it straight back. So a
 * fixture built with widths [101..106] lets an assertion state the exact page order of an
 * output, which is the thing a unit test on a pure step cannot see.
 */
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

/**
 * One page per entry of `widths`, each stamped with its own number. A page is recognised
 * later by its width, so keep the widths distinct.
 */
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

/** Page widths of a PDF, in order. The order assertion for merge, split and organize. */
export async function pageWidths(bytes: Buffer): Promise<number[]> {
  const document = await PDFDocument.load(bytes)
  return document.getPages().map((page) => Math.round(page.getSize().width))
}

export async function pageCount(bytes: Buffer): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount()
}

export type Box = { x: number; y: number; width: number; height: number }

/** Page size in points, rounded — the assertion for jpg-to-pdf's chosen page size. */
export async function pageSizes(bytes: Buffer): Promise<Array<{ width: number; height: number }>> {
  const document = await PDFDocument.load(bytes)
  return document.getPages().map((page) => {
    const { width, height } = page.getSize()
    return { width: Math.round(width), height: Math.round(height) }
  })
}

/** A page's `/CropBox` and `/MediaBox`, which crop must leave different from each other. */
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

/** `/Rotate` of every page, normalised to 0–359. */
export async function pageRotations(bytes: Buffer): Promise<number[]> {
  const document = await PDFDocument.load(bytes)
  return document.getPages().map((page) => ((page.getRotation().angle % 360) + 360) % 360)
}

/**
 * The decoded content stream of one page, as text, with PDF hex strings expanded.
 *
 * Both text tools draw with pdf-lib, which writes the string as `<32206F662033> Tj` into
 * a Flate-encoded content stream. Expanding that to `2 of 3` and searching for it proves
 * the text is really in the output bytes rather than only on screen — which is the whole
 * reason the suite needs no PDF text extractor.
 */
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

/** `<32206F662033>` → `2 of 3`. `<<` never matches, so dictionaries are left alone. */
const expandHexStrings = (stream: string): string =>
  stream.replace(/<([\dA-Fa-f\s]+)>/g, (match, hex: string) => {
    const digits = hex.replace(/\s/g, '')
    return digits.length % 2 === 0 ? Buffer.from(digits, 'hex').toString('latin1') : match
  })
