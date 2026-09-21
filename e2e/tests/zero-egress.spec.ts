import { expect, test } from '@playwright/test'

test('the landing page and a tool route make no cross-origin requests', async ({ page }) => {
  const requests = new Set<string>()

  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith('data:') && !url.startsWith('blob:')) requests.add(url)
  })
  page.context().on('request', (request) => requests.add(request.url()))

  await page.goto('/')
  await expect(page.locator('main')).toBeVisible()
  await page.goto('/merge')
  await expect(page.locator('main')).toBeVisible()
  await page.waitForLoadState('networkidle')

  const appOrigin = new URL(page.url()).origin
  const egress = [...requests].filter(
    (url) =>
      !url.startsWith('data:') && !url.startsWith('blob:') && new URL(url).origin !== appOrigin,
  )
  expect(egress, `cross-origin requests: ${egress.join(', ')}`).toEqual([])
})
