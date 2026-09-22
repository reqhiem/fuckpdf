import { expect, test } from '@playwright/test'
import { createPagedPdf } from '../fixtures/pdf'
import { openTool, pdfFile, upload } from '../fixtures/ui'

test('the shell exposes tools and opens a tool dropzone', async ({ page }) => {
  await page.goto('/')

  const tool = page.getByRole('link', { name: /merge/i }).first()
  await expect(tool).toBeVisible()
  await tool.click()
  await expect(page).toHaveURL(/\/merge$/)
  await expect(
    page
      .getByRole('button', { name: /drop|choose|select.*file/i })
      .or(page.getByLabel(/drop|choose|select.*file/i)),
  ).toBeVisible()
})

/** The nine anchors show only a dot, so their names come from labels; this shipped
 * nameless once. A file is uploaded first because an empty tool page has no options. */
test('the page-numbers position picker is reachable by name', async ({ page }) => {
  await openTool(page, 'page-numbers', 'Page numbers')
  await upload(page, [pdfFile('one.pdf', await createPagedPdf([200]))])

  const group = page.getByRole('group', { name: /position/i })
  await expect(group).toBeVisible()
  await expect(group.getByRole('button')).toHaveCount(9)

  const bottomCentre = group.getByRole('button', { name: /bottom centre/i })
  await expect(bottomCentre).toHaveAttribute('aria-pressed', 'true')

  const topLeft = group.getByRole('button', { name: /top left/i })
  await topLeft.click()
  await expect(topLeft).toHaveAttribute('aria-pressed', 'true')
  await expect(bottomCentre).toHaveAttribute('aria-pressed', 'false')
})
