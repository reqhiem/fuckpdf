import type { PdfiumEngine } from '@fuckpdf/engine-pdfium'
import type { Output, PdfInput, RunContext, ToolStep } from './types'
import { checkCancel, generateZipName, makeZip } from './utils'

export type PdfToJpgOptions = {
  engine: PdfiumEngine
  dpi: number
  format: 'jpeg' | 'png' | 'webp'
  /** Shell injects this since we can't use DOM/globals to encode RGBA. For tests, can be mock. */
  encode?: (rgba: Uint8Array, width: number, height: number, format: string) => Promise<Uint8Array>
}

export const defaultOptions: Omit<PdfToJpgOptions, 'engine'> = {
  dpi: 150,
  format: 'jpeg',
}

export const inputs = { min: 1, max: 1 }
export const accept = ['application/pdf']

export const run: ToolStep<Record<string, unknown>> = async (
  inputsList: PdfInput[],
  rawOptions: Record<string, unknown>,
  ctx?: RunContext,
): Promise<Output[]> => {
  const options = rawOptions as unknown as PdfToJpgOptions
  const input = inputsList[0]
  if (!input) return []
  checkCancel(ctx)

  if (!options.engine) throw new Error('Engine required')

  const results: { name: string; bytes: Uint8Array; mime: string }[] = []

  await options.engine.withDocument(
    input.bytes,
    async (doc: import('@fuckpdf/engine-pdfium').PdfiumDocument) => {
      const totalPages = doc.pageCount

      for (let i = 0; i < totalPages; i++) {
        checkCancel(ctx)
        ctx?.onProgress?.({ value: i / totalPages, stage: 'page' })

        const rendered = await doc.render({ page: i + 1, dpi: options.dpi })

        let finalBytes = rendered.data
        if (options.encode) {
          finalBytes = await options.encode(
            rendered.data,
            rendered.width,
            rendered.height,
            options.format,
          )
        }

        const ext = options.format === 'jpeg' ? 'jpg' : options.format
        const mime = `image/${options.format}`
        const baseName = input.name.replace(/\.[^/.]+$/, '')
        const name = totalPages > 1 ? `${baseName}-${i + 1}.${ext}` : `${baseName}.${ext}`

        results.push({ name, bytes: finalBytes, mime })
      }
    },
    input.password,
  )

  ctx?.onProgress?.({ value: 1, stage: 'done' })

  if (results.length > 1) {
    const files: Record<string, Uint8Array> = {}
    for (const r of results) {
      files[r.name] = r.bytes
    }
    return [
      {
        name: generateZipName('pdf-to-jpg'),
        bytes: makeZip(files),
        mime: 'application/zip',
      },
    ]
  }

  return results
}
