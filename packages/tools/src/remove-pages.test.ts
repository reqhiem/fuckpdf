import { PDFDocument } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './remove-pages'

test('remove pages', async () => {
  const p = await PDFDocument.create()
  p.addPage()
  p.addPage()
  p.addPage()
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], { pages: '2' })
  if (!res[0]) throw new Error('fail')
  const out = await PDFDocument.load(res[0].bytes)
  expect(out.getPageCount()).toBe(2)
})
