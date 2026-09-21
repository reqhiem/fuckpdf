import { PDFDocument } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './split'

test('split every-n', async () => {
  const p = await PDFDocument.create()
  p.addPage()
  p.addPage()
  p.addPage()
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], { mode: 'every-n', everyN: 2 })
  expect(res.length).toBe(2)
  if (!res[0] || !res[1]) throw new Error('fail')
  const o1 = await PDFDocument.load(res[0].bytes)
  const o2 = await PDFDocument.load(res[1].bytes)
  expect(o1.getPageCount()).toBe(2)
  expect(o2.getPageCount()).toBe(1)
})
