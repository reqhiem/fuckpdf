import { zipSync } from 'fflate'
import { PDFDocument } from 'pdf-lib'
import { PasswordRequiredError, type RunContext } from './types'

export async function loadPdf(bytes: Uint8Array, password?: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: !password })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.toLowerCase() : ''
    const name = err instanceof Error ? err.name : ''
    if (
      !password &&
      (message.includes('encrypt') || message.includes('password') || name.includes('Encrypt'))
    ) {
      throw new PasswordRequiredError('input')
    }
    throw err
  }
}

export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr.trim()) {
    return Array.from({ length: maxPages }, (_, i) => i)
  }
  const pages = new Set<number>()
  for (const part of rangeStr.split(',')) {
    const p = part.trim()
    if (!p) continue
    if (p.includes('-')) {
      const [start, end] = p.split('-').map(Number)
      if (start && end && start <= end && start >= 1 && end <= maxPages) {
        for (let i = start; i <= end; i++) pages.add(i - 1)
      }
    } else {
      const num = Number(p)
      if (num >= 1 && num <= maxPages) pages.add(num - 1)
    }
  }
  return Array.from(pages).sort((a, b) => a - b)
}

export function checkCancel(ctx?: RunContext) {
  if (ctx?.signal?.aborted) {
    throw new Error('Cancelled')
  }
}

export function makeZip(files: Record<string, Uint8Array>): Uint8Array {
  return zipSync(files)
}

export function generateOutputName(original: string, tool: string): string {
  const base = original.replace(/\.[^/.]+$/, '')
  return `${base}-${tool}.pdf`
}

export function generateZipName(tool: string): string {
  return `fuckpdf-${tool}-${Date.now()}.zip`
}
