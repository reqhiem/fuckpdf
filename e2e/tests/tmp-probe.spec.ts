import { expect, test } from '@playwright/test'
import { createPagedPdf } from '../fixtures/pdf'
import { openTool, pdfFile, upload, waitForGrid } from '../fixtures/ui'

test.describe.configure({ timeout: 120_000 })

const snap = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('img[alt^="Page"]')]
      .map((i) => `${(i as HTMLImageElement).src.slice(-4)}/${getComputedStyle(i).rotate}`)
      .join(' '),
  )

test('probe rotation state', async ({ page }) => {
  await openTool(page, 'organize', 'Organize PDF')
  await upload(page, [pdfFile('six.pdf', await createPagedPdf([101, 102, 103, 104, 105, 106]))])
  await waitForGrid(page, 6)

  console.log('C0 control   :', await snap(page))
  await page.getByRole('button', { name: 'Rotate page 5' }).click()
  console.log('C1 rot-no-drag:', await snap(page))
  await page.getByRole('button', { name: 'Rotate page 5' }).click()
  console.log('C2 rot-again :', await snap(page))
  console.log('T0 pre-drag  :', await snap(page))
  const grip = (n: number) => page.getByRole('button', { name: `Move page ${n}` })
  const from = (await grip(1).boundingBox())!
  const to = (await grip(3).boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await page.mouse.up()
  console.log('T1 after up  :', await snap(page))
  await expect(page.getByRole('status')).toContainText('Page 1 dropped at position 3.')
  console.log('T2 announced :', await snap(page))
  await page.getByRole('button', { name: 'Rotate page 1' }).click()
  console.log('T3 rotated   :', await snap(page))
  await page.getByRole('button', { name: 'Rotate page 1' }).click()
  console.log('T4 rotated2  :', await snap(page))
  await page.waitForTimeout(600)
  console.log('T5 settled   :', await snap(page))
})
