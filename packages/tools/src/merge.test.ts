import { PDFDocument } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './merge'

test('merge two pdfs', async () => {
  const p1 = await PDFDocument.create()
  p1.addPage()
  const p2 = await PDFDocument.create()
  p2.addPage()
  const res = await run(
    [
      { name: '1.pdf', bytes: await p1.save() },
      { name: '2.pdf', bytes: await p2.save() },
    ],
    { order: ['1.pdf', '2.pdf'] },
  )

  expect(res.length).toBe(1)
  if (!res[0]) throw new Error('fail')
  const out = await PDFDocument.load(res[0].bytes)
  expect(out.getPageCount()).toBe(2)
})
