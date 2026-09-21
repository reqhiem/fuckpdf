// Browser-only entry point: the bundler emits the binary as a content-hashed asset that
// is served from our own origin. `DEFAULT_PDFIUM_WASM_URL` from `@embedpdf/pdfium` points
// at a CDN and must never be used (AGENTS.md invariant 1, zero egress).
import wasmUrl from '@embedpdf/pdfium/pdfium.wasm?url'
import type { WasmSource } from './engine'

export const pdfiumWasmUrl = wasmUrl

export const loadPdfiumWasm: WasmSource = async () => {
  const response = await fetch(pdfiumWasmUrl)
  if (!response.ok) {
    throw new Error(`Could not load the PDF engine (HTTP ${response.status} for ${pdfiumWasmUrl})`)
  }
  return response.arrayBuffer()
}
