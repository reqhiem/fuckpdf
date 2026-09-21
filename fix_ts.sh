#!/bin/bash
cd packages/tools/src

for file in merge.ts split.ts remove-pages.ts extract-pages.ts organize.ts rotate.ts page-numbers.ts watermark.ts crop.ts jpg-to-pdf.ts pdf-to-jpg.ts; do
  # Extract the Options type name (e.g. MergeOptions)
  optType=$(grep 'export type .*Options =' $file | sed -E 's/export type (.*Options) =.*/\1/')
  if [ -z "$optType" ]; then
    optType=$(grep 'export type .*Options' $file | head -1 | awk '{print $3}')
  fi

  # Replace the run signature
  # We look for "export const run: ToolStep<$optType> = async (inputsList: PdfInput[], options: $optType, ctx?: RunContext): Promise<Output[]> => {"
  # and replace it with:
  # "export const run: ToolStep<Record<string, unknown>> = async (inputsList: PdfInput[], rawOptions: Record<string, unknown>, ctx?: RunContext): Promise<Output[]> => {
  #   const options = rawOptions as unknown as $optType"

  sed -i "s/export const run: ToolStep<$optType> = async (inputsList: PdfInput\[\], options: $optType, ctx?: RunContext): Promise<Output\[\]> => {/export const run: ToolStep<Record<string, unknown>> = async (inputsList: PdfInput[], rawOptions: Record<string, unknown>, ctx?: RunContext): Promise<Output[]> => {\n  const options = rawOptions as unknown as $optType/" $file

done

# Fix utils.ts loadPdf signature and body
cat << 'UTILS' > utils.ts
import { PDFDocument } from 'pdf-lib'
import { PasswordRequiredError, type RunContext } from './types'
import { zipSync } from 'fflate'

export async function loadPdf(bytes: Uint8Array, password?: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: password ? false : true })
  } catch (err: any) {
    if (!password && (err.message?.toLowerCase().includes('encrypt') || err.message?.toLowerCase().includes('password') || err.name?.includes('Encrypt'))) {
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
UTILS

# Fix tests
sed -i 's/res\[0\]\.bytes/res[0]!.bytes/g' *.test.ts
sed -i 's/res\[1\]\.bytes/res[1]!.bytes/g' *.test.ts

