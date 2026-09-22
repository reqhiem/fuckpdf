import { expect, test } from 'vitest'
import { canRunLive, LIVE_PREVIEW_MAX_BYTES, previewKind } from './preview-source'

const output = (mime: string): { name: string; bytes: Uint8Array; mime: string } => ({
  name: 'out',
  bytes: new Uint8Array(),
  mime,
})

test('a file at the limit still runs live, one byte over does not', () => {
  expect(canRunLive(LIVE_PREVIEW_MAX_BYTES)).toBe(true)
  expect(canRunLive(LIVE_PREVIEW_MAX_BYTES + 1)).toBe(false)
  expect(canRunLive(0)).toBe(true)
})

test('only a PDF or an image is showable; a zip falls back to the input', () => {
  expect(previewKind(output('application/pdf'))).toBe('pdf')
  expect(previewKind(output('image/jpeg'))).toBe('image')
  expect(previewKind(output('image/png'))).toBe('image')
  expect(previewKind(output('application/zip'))).toBe('none')
})
