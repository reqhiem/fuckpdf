import { expect, test } from '@playwright/test'

test.describe('before the JavaScript arrives', () => {
  test.use({ javaScriptEnabled: false })

  test('the landing page is already the real page', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link', { name: 'Merge' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Merge PDF/ }).first()).toBeVisible()
  })

  test('a tool page is already the real page', async ({ page }) => {
    await page.goto('/merge')
    await expect(page.getByRole('heading', { level: 1, name: 'Merge PDF' })).toBeVisible()
    await expect(page.getByText('Drop files here')).toBeVisible()
  })
})

test('every prerendered route hydrates, and an unknown one renders, without an error', async ({
  page,
  request,
}) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, url]) => new URL(url).pathname,
  )
  expect(paths.length).toBeGreaterThan(10)

  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
  for (const path of [...paths, '/no-such-tool']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect(errors, path).toEqual([])
  }
})
