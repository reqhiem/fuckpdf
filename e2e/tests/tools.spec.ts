/**
 * One test per M1 tool, driven through the real UI and asserted against the bytes the
 * browser actually downloads.
 *
 * Unit tests already cover the steps, so this suite deliberately asserts nothing a step
 * test could see. It exists for the gap between them: routing, the options panel wiring,
 * the page grid, the worker-backed engine and the download path. A tool passes here only
 * when the downloaded file is one a correct run could have produced.
 */
import { expect, test } from '@playwright/test'
import { createPng, MAGIC, unzip } from '../fixtures/bytes'
import {
  createPagedPdf,
  pageBoxes,
  pageContent,
  pageCount,
  pageRotations,
  pageSizes,
  pageWidths,
} from '../fixtures/pdf'
import {
  openTool,
  pageThumbnail,
  pdfFile,
  runAndDownload,
  upload,
  waitForGrid,
} from '../fixtures/ui'

// Each of these loads a wasm engine and renders thumbnails before it can assert anything.
test.describe.configure({ timeout: 120_000 })

const SIX_PAGES = [101, 102, 103, 104, 105, 106]

const sixPagePdf = () => createPagedPdf(SIX_PAGES)

test('merge concatenates both inputs in the order they were dropped', async ({ page }) => {
  await openTool(page, 'merge', 'Merge PDF')
  await upload(page, [
    pdfFile('alpha.pdf', await createPagedPdf([201, 202])),
    pdfFile('beta.pdf', await createPagedPdf([301, 302])),
  ])

  const output = await runAndDownload(page)

  expect(await pageCount(output)).toBe(4)
  expect(await pageWidths(output)).toEqual([201, 202, 301, 302])
})

test('split every 2 pages returns three parts of two pages each', async ({ page }) => {
  await openTool(page, 'split', 'Split PDF')
  await upload(page, [pdfFile('six.pdf', await sixPagePdf())])

  await page.getByLabel('Split mode').selectOption('every-n')
  await page.getByLabel('Pages per split').fill('2')

  const bundle = unzip(await runAndDownload(page))

  expect(Object.keys(bundle).sort()).toEqual([
    'six-split-1.pdf',
    'six-split-2.pdf',
    'six-split-3.pdf',
  ])
  expect(await pageWidths(bundle['six-split-1.pdf'] as Buffer)).toEqual([101, 102])
  expect(await pageWidths(bundle['six-split-2.pdf'] as Buffer)).toEqual([103, 104])
  expect(await pageWidths(bundle['six-split-3.pdf'] as Buffer)).toEqual([105, 106])
})

test('remove-pages drops exactly the pages picked in the grid', async ({ page }) => {
  await openTool(page, 'remove-pages', 'Remove pages')
  await upload(page, [pdfFile('six.pdf', await sixPagePdf())])
  await waitForGrid(page, 6)

  await pageThumbnail(page, 2, 6).click()
  await pageThumbnail(page, 4, 6).click({ modifiers: ['ControlOrMeta'] })
  await expect(page.getByText('2 selected')).toBeVisible()

  const output = await runAndDownload(page)

  expect(await pageCount(output)).toBe(4)
  expect(await pageWidths(output)).toEqual([101, 103, 105, 106])
})

test('extract-pages keeps only the pages picked in the grid', async ({ page }) => {
  await openTool(page, 'extract-pages', 'Extract pages')
  await upload(page, [pdfFile('six.pdf', await sixPagePdf())])
  await waitForGrid(page, 6)

  await pageThumbnail(page, 2, 6).click()
  await pageThumbnail(page, 3, 6).click({ modifiers: ['ControlOrMeta'] })
  await expect(page.getByText('2 selected')).toBeVisible()

  const output = await runAndDownload(page)

  expect(await pageWidths(output)).toEqual([102, 103])
})

test('organize writes the grid order, and a rotated page keeps its rotation', async ({ page }) => {
  await openTool(page, 'organize', 'Organize PDF')
  await upload(page, [pdfFile('six.pdf', await sixPagePdf())])
  await waitForGrid(page, 6)

  const grip = (number: number) => page.getByRole('button', { name: `Move page ${number}` })
  const from = await grip(1).boundingBox()
  const to = await grip(3).boundingBox()
  if (!from || !to) throw new Error('the grid drag handles have no layout box')

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  // dnd-kit's pointer sensor ignores the first 4px, so nudge before travelling.
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await page.mouse.up()

  // dnd-kit announces the drop in a live region; that is the grid telling us it reordered.
  await expect(page.getByRole('status')).toContainText('Page 1 dropped at position 3.')

  // Position 1 now holds what was page 2, so this rotates the page that is 102pt wide.
  await page.getByRole('button', { name: 'Rotate page 1' }).click()

  const output = await runAndDownload(page)

  expect(await pageWidths(output)).toEqual([102, 103, 101, 104, 105, 106])
  expect(await pageRotations(output)).toEqual([90, 0, 0, 0, 0, 0])
})

test('rotate writes /Rotate 90 on every page', async ({ page }) => {
  await openTool(page, 'rotate', 'Rotate PDF')
  await upload(page, [pdfFile('three.pdf', await createPagedPdf([101, 102, 103]))])

  await page.getByLabel('Rotation angle').selectOption('90')

  const output = await runAndDownload(page)

  expect(await pageRotations(output)).toEqual([90, 90, 90])
})

test('page-numbers stamps the running number into each page', async ({ page }) => {
  await openTool(page, 'page-numbers', 'Page numbers')
  await upload(page, [pdfFile('three.pdf', await createPagedPdf([400, 400, 400]))])

  await page.getByLabel('Format (use {n} and {total})').fill('{n} of {total}')

  const output = await runAndDownload(page)

  expect(await pageContent(output, 1)).toContain('2 of 3')
  expect(await pageContent(output, 0)).toContain('1 of 3')
  expect(await pageContent(output, 2)).toContain('3 of 3')
})

test('watermark draws its text into the page content', async ({ page }) => {
  await openTool(page, 'watermark', 'Watermark')
  await upload(page, [pdfFile('two.pdf', await createPagedPdf([400, 400]))])

  await page.getByLabel('Text', { exact: true }).fill('TOP SECRET')

  const output = await runAndDownload(page)

  expect(await pageContent(output, 0)).toContain('TOP SECRET')
  expect(await pageContent(output, 1)).toContain('TOP SECRET')
})

test('crop sets a CropBox that differs from the MediaBox', async ({ page }) => {
  await openTool(page, 'crop', 'Crop PDF')
  await upload(page, [pdfFile('two.pdf', await createPagedPdf([400, 400], 600))])
  await waitForGrid(page, 2)

  await page.getByLabel('X', { exact: true }).fill('10')
  await page.getByLabel('Y', { exact: true }).fill('20')
  await page.getByLabel('Width', { exact: true }).fill('200')
  await page.getByLabel('Height', { exact: true }).fill('300')

  const output = await runAndDownload(page)
  const { crop, media } = await pageBoxes(output, 0)

  expect(media).toEqual({ x: 0, y: 0, width: 400, height: 600 })
  expect(crop).toEqual({ x: 10, y: 20, width: 200, height: 300 })
  expect(crop).not.toEqual(media)
})

test('jpg-to-pdf makes one page at the chosen page size', async ({ page }) => {
  await openTool(page, 'jpg-to-pdf', 'JPG to PDF')
  await upload(page, [{ name: 'shot.png', mimeType: 'image/png', buffer: createPng(200, 100) }])

  await page.getByLabel('Page size').selectOption('Letter')

  const output = await runAndDownload(page)

  expect(await pageCount(output)).toBe(1)
  expect(await pageSizes(output)).toEqual([{ width: 612, height: 792 }])
})

test('pdf-to-jpg exports one real PNG per page', async ({ page }) => {
  await openTool(page, 'pdf-to-jpg', 'PDF to JPG')
  await upload(page, [pdfFile('pages.pdf', await createPagedPdf([200, 200, 200], 200))])

  await page.getByLabel('Format').selectOption('png')
  await page.getByLabel('DPI (72-300)').fill('72')

  const bundle = unzip(await runAndDownload(page))

  expect(Object.keys(bundle).sort()).toEqual(['pages-1.png', 'pages-2.png', 'pages-3.png'])
  for (const [name, bytes] of Object.entries(bundle)) {
    expect([...bytes.subarray(0, 4)], `${name} is not a PNG`).toEqual(MAGIC.png)
  }
})
