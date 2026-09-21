import { PDFDocument } from 'pdf-lib'
import { type Output, PasswordRequiredError, type PdfInput, type RunContext, type ToolStep } from './types'
import { checkCancel, generateZipName, loadPdf, makeZip, parsePageRange } from './utils'

export type SplitMode = 'custom' | 'every-n' | 'all' | 'size'

export type SplitOptions = {
  mode: SplitMode
  /** For custom mode: array of page ranges, e.g. ["1-5", "6-10"] */
  ranges?: string[]
  /** For every-n mode: N */
  everyN?: number
  /** For size mode: max size in bytes */
  maxSize?: number
  /** Whether to output a single zip file containing all split PDFs */
  zip?: boolean
}

export const defaultOptions: SplitOptions = { mode: 'all' }
export const inputs = { min: 1, max: 1 }
export const accept = ['application/pdf']

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as SplitOptions
  const input = inputsList[0]
  if (!input) return []
  checkCancel(ctx)

  let pdf: PDFDocument
  try {
    pdf = await loadPdf(input.bytes, input.password)
  } catch (err: unknown) {
    if (err instanceof PasswordRequiredError) throw new PasswordRequiredError(input.name)
    throw err
  }

  const totalPages = pdf.getPageCount()
  const outPdfBytes: { name: string; bytes: Uint8Array }[] = []

  const processRange = async (indices: number[], index: number) => {
    checkCancel(ctx)
    if (indices.length === 0) return
    const newPdf = await PDFDocument.create()
    const copied = await newPdf.copyPages(pdf, indices)
    for (const page of copied) newPdf.addPage(page)
    const bytes = await newPdf.save()
    const name = `${input.name.replace(/\.[^/.]+$/, '')}-split-${index + 1}.pdf`
    outPdfBytes.push({ name, bytes })
  }

  if (options.mode === 'all') {
    for (let i = 0; i < totalPages; i++) {
      ctx?.onProgress?.({ value: i / totalPages, stage: 'page' })
      await processRange([i], i)
    }
  } else if (options.mode === 'custom' && options.ranges) {
    for (let i = 0; i < options.ranges.length; i++) {
      ctx?.onProgress?.({ value: i / options.ranges.length, stage: 'range' })
      const indices = parsePageRange(options.ranges[i] || '', totalPages)
      await processRange(indices, i)
    }
  } else if (options.mode === 'every-n' && options.everyN && options.everyN > 0) {
    let part = 0
    for (let i = 0; i < totalPages; i += options.everyN) {
      ctx?.onProgress?.({ value: i / totalPages, stage: 'part' })
      const indices = []
      for (let j = 0; j < options.everyN && i + j < totalPages; j++) {
        indices.push(i + j)
      }
      await processRange(indices, part++)
    }
  } else if (options.mode === 'size' && options.maxSize && options.maxSize > 0) {
    // Bisection
    let startPage = 0
    let part = 0
    while (startPage < totalPages) {
      checkCancel(ctx)
      ctx?.onProgress?.({ value: startPage / totalPages, stage: 'size' })

      let lastValidBytes: Uint8Array | null = null

      // Simple linear scan for now, PRD says bisection but linear is simpler and less error-prone
      // Wait, PRD: "by max file size (bisection)"
      let low = startPage
      let high = totalPages - 1
      let bestEnd = startPage

      while (low <= high) {
        checkCancel(ctx)
        const mid = Math.floor((low + high) / 2)
        const indices = []
        for (let i = startPage; i <= mid; i++) indices.push(i)

        const newPdf = await PDFDocument.create()
        const copied = await newPdf.copyPages(pdf, indices)
        for (const page of copied) newPdf.addPage(page)
        const bytes = await newPdf.save()

        if (bytes.length <= options.maxSize) {
          bestEnd = mid
          lastValidBytes = bytes
          low = mid + 1
        } else {
          high = mid - 1
        }
      }

      if (!lastValidBytes) {
        // Even 1 page is too big, output it anyway
        const indices = [startPage]
        const newPdf = await PDFDocument.create()
        const copied = await newPdf.copyPages(pdf, indices)
        for (const page of copied) newPdf.addPage(page)
        lastValidBytes = await newPdf.save()
        bestEnd = startPage
      }

      const name = `${input.name.replace(/\.[^/.]+$/, '')}-split-${part + 1}.pdf`
      outPdfBytes.push({ name, bytes: lastValidBytes })

      startPage = bestEnd + 1
      part++
    }
  }

  ctx?.onProgress?.({ value: 1, stage: 'done' })

  if (options.zip) {
    const files: Record<string, Uint8Array> = {}
    for (const out of outPdfBytes) {
      files[out.name] = out.bytes
    }
    return [
      {
        name: generateZipName('split'),
        bytes: makeZip(files),
        mime: 'application/zip',
      },
    ]
  }

  return outPdfBytes.map((out) => ({
    name: out.name,
    bytes: out.bytes,
    mime: 'application/pdf',
  }))
}
