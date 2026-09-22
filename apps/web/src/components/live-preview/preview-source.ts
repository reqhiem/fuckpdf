import type { Output } from '@fuckpdf/tools'

/** Above this, a re-run per option change costs a full parse and write, per keystroke. */
export const LIVE_PREVIEW_MAX_BYTES = 15 * 1024 * 1024

export const canRunLive = (size: number) => size <= LIVE_PREVIEW_MAX_BYTES

export const previewKind = (output: Output): 'pdf' | 'image' | 'none' => {
  if (output.mime === 'application/pdf') return 'pdf'
  return output.mime.startsWith('image/') ? 'image' : 'none'
}
