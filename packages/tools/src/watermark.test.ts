import { PDFDocument } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './watermark'

test('watermark', async () => {
  const p = await PDFDocument.create()
  p.addPage()
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], {
    type: 'text',
    text: 'HELLO',
    mode: 'positioned',
    opacity: 0.5,
    rotation: 0,
    layer: 'over',
  })
  expect(res.length).toBe(1)
})
