import { PDFDocument } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './organize'

test('organize pages', async () => {
  const p = await PDFDocument.create()
  p.addPage()
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], {
    operations: [{ type: 'page', fileIndex: 0, pageIndex: 0 }, { type: 'blank' }],
  })
  if (!res[0]) throw new Error('fail')
  const out = await PDFDocument.load(res[0].bytes)
  expect(out.getPageCount()).toBe(2)
})
