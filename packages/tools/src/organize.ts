import { degrees, PDFDocument } from 'pdf-lib'
import type { Output, PdfInput, RunContext, ToolStep } from './types'
import { checkCancel, generateOutputName, loadPdf } from './utils'

export type OrganizeOp =
  | { type: 'page'; fileIndex: number; pageIndex: number; rotate?: number }
  | { type: 'blank'; width?: number; height?: number }

export type OrganizeOptions = {
  operations: OrganizeOp[]
}

export const defaultOptions: OrganizeOptions = { operations: [] }
export const inputs = { min: 1, max: 1000 }
export const accept = ['application/pdf']

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as OrganizeOptions
  if (!inputsList.length) return []
  checkCancel(ctx)

  const loadedPdfs: PDFDocument[] = []
  for (let i = 0; i < inputsList.length; i++) {
    checkCancel(ctx)
    ctx?.onProgress?.({ value: i / inputsList.length, stage: 'load' })
    const input = inputsList[i]
    if (!input) continue
    loadedPdfs.push(await loadPdf(input.bytes, input.password))
  }

  const outPdf = await PDFDocument.create()
  const ops = options.operations || []

  for (let i = 0; i < ops.length; i++) {
    checkCancel(ctx)
    ctx?.onProgress?.({ value: i / ops.length, stage: 'page' })
    const op = ops[i]
    if (!op) continue

    if (op.type === 'page') {
      const srcPdf = loadedPdfs[op.fileIndex]
      if (srcPdf) {
        const [copied] = await outPdf.copyPages(srcPdf, [op.pageIndex])
        if (copied) {
          if (op.rotate) {
            const current = copied.getRotation().angle
            copied.setRotation(degrees(current + op.rotate))
          }
          outPdf.addPage(copied)
        }
      }
    } else if (op.type === 'blank') {
      const width = op.width || 595.28 // A4 width
      const height = op.height || 841.89 // A4 height
      outPdf.addPage([width, height])
    }
  }

  ctx?.onProgress?.({ value: 1, stage: 'done' })
  return [
    {
      name: generateOutputName(inputsList[0]?.name || 'out', 'organize'),
      bytes: await outPdf.save(),
      mime: 'application/pdf',
    },
  ]
}
