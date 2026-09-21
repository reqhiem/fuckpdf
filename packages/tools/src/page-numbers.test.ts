import { PDFDocument } from 'pdf-lib'
import { expect, test } from 'vitest'
import { run } from './page-numbers'

test('page numbers', async () => {
  const p = await PDFDocument.create()
  p.addPage()
  const res = await run([{ name: '1.pdf', bytes: await p.save() }], {
    position: 'bottom-center',
    firstNumber: 1,
    format: '{n}',
    font: 'Helvetica',
    size: 12,
    color: '000000',
    margin: 20,
  })
  expect(res.length).toBe(1)
})
