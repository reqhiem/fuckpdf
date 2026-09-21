import { PDFDocument } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './rotate'

test('rotate pages', async () => {
  const p = await PDFDocument.create()
  p.addPage()
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], { angle: 90 })
  if (!res[0]) throw new Error('fail')
  const out = await PDFDocument.load(res[0].bytes)
  expect(out.getPages()[0]?.getRotation().angle).toBe(90)
})
