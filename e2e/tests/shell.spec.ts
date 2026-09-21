import { expect, test } from '@playwright/test'

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
