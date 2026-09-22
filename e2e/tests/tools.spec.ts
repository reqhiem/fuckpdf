// One test per tool, driven through the real UI and asserted against the downloaded
// bytes. Unit tests cover the steps; this covers everything between them.
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
  chooseOption,
  chooseToggle,
  openTool,
  pageThumbnail,
  pdfFile,
  runAndDownload,
  setNumber,
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

  await chooseOption(page, 'Split mode', 'Every N pages')
  await setNumber(page, 'Pages per split', '2')

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

  // Rotate before dragging: dnd-kit suppresses clicks for ~50ms after a drop, so a rotate
  // issued in that window never reaches React.
  await page.getByRole('button', { name: 'Rotate page 2' }).click()
  await expect(page.getByRole('img', { name: 'Page 2 of 6' })).toHaveCSS('rotate', '90deg')

  const grip = (number: number) => page.getByRole('button', { name: `Move page ${number}` })
  const from = await grip(1).boundingBox()
  const to = await grip(3).boundingBox()
  if (!from || !to) throw new Error('the grid drag handles have no layout box')

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  // The pointer sensor ignores the first 4px, so nudge before travelling.
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await page.mouse.up()

  await expect(page.getByRole('status')).toContainText('Page 1 dropped at position 3.')
  // Wait out the click guard described above before pressing Run.
  await page.waitForTimeout(150)

  const output = await runAndDownload(page)

  expect(await pageWidths(output)).toEqual([102, 103, 101, 104, 105, 106])
  expect(await pageRotations(output)).toEqual([90, 0, 0, 0, 0, 0])
})

test('rotate writes /Rotate 90 on every page', async ({ page }) => {
  await openTool(page, 'rotate', 'Rotate PDF')
  await upload(page, [pdfFile('three.pdf', await createPagedPdf([101, 102, 103]))])

  await chooseToggle(page, 'Rotation angle', '90°')

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

  await setNumber(page, 'X', '10')
  await setNumber(page, 'Y', '20')
  await setNumber(page, 'Width', '200')
  await setNumber(page, 'Height', '300')

  const output = await runAndDownload(page)
  const { crop, media } = await pageBoxes(output, 0)

  expect(media).toEqual({ x: 0, y: 0, width: 400, height: 600 })
  expect(crop).toEqual({ x: 10, y: 20, width: 200, height: 300 })
  expect(crop).not.toEqual(media)
})

test('jpg-to-pdf makes one page at the chosen page size', async ({ page }) => {
  await openTool(page, 'jpg-to-pdf', 'JPG to PDF')
  await upload(page, [{ name: 'shot.png', mimeType: 'image/png', buffer: createPng(200, 100) }])

  await chooseToggle(page, 'Page size', 'Letter')

  const output = await runAndDownload(page)

  expect(await pageCount(output)).toBe(1)
  expect(await pageSizes(output)).toEqual([{ width: 612, height: 792 }])
})

test('pdf-to-jpg exports one real PNG per page', async ({ page }) => {
  await openTool(page, 'pdf-to-jpg', 'PDF to JPG')
  await upload(page, [pdfFile('pages.pdf', await createPagedPdf([200, 200, 200], 200))])

  await chooseToggle(page, 'Format', 'PNG')
  await setNumber(page, 'DPI (72-300)', '72')

  const bundle = unzip(await runAndDownload(page))

  expect(Object.keys(bundle).sort()).toEqual(['pages-1.png', 'pages-2.png', 'pages-3.png'])
  for (const [name, bytes] of Object.entries(bundle)) {
    expect([...bytes.subarray(0, 4)], `${name} is not a PNG`).toEqual(MAGIC.png)
  }
})

test('edit draws a rectangle where the editor put it', async ({ page }) => {
  await openTool(page, 'edit', 'Edit PDF')
  await upload(page, [pdfFile('one.pdf', await createPagedPdf([400]))])

  const canvas = page.getByRole('application', { name: 'Page canvas' })
  await expect(canvas).toBeVisible({ timeout: 60_000 })
  await chooseToggle(page, 'Tool', 'Rectangle')

  // page.mouse works in viewport coordinates, and the canvas sits well below the fold.
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('the editor canvas has no layout box')
  await page.mouse.move(box.x + 40, box.y + 40)
  await page.mouse.down()
  await page.mouse.move(box.x + 160, box.y + 140, { steps: 10 })
  await page.mouse.up()

  // Typed rather than dragged, so the assertion is exact whatever the canvas is scaled to.
  // The editor measures y from the top of the page; pdf-lib does not.
  await setNumber(page, 'X (pt)', '50')
  await setNumber(page, 'Y (pt)', '60')
  await setNumber(page, 'Width (pt)', '120')
  await setNumber(page, 'Height (pt)', '100')

  const output = await runAndDownload(page)
  const content = await pageContent(output, 0)

  expect(await pageCount(output)).toBe(1)
  expect(content).toContain('1 0 0 1 50 632 cm')
  expect(content).toContain('120 100 l')
  expect(content).toContain('PAGE-1 Tj')
})

test('merge follows the order the file strip was dragged into', async ({ page }) => {
  await openTool(page, 'merge', 'Merge PDF')
  await upload(page, [
    pdfFile('alpha.pdf', await createPagedPdf([201, 202])),
    pdfFile('beta.pdf', await createPagedPdf([301, 302])),
  ])

  const grip = (name: string) => page.getByRole('button', { name: new RegExp(`^Move ${name}`) })
  const from = await grip('beta\\.pdf').boundingBox()
  const to = await grip('alpha\\.pdf').boundingBox()
  if (!from || !to) throw new Error('the file strip drag handles have no layout box')

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 - 12, from.y + from.height / 2, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await page.mouse.up()

  await expect(page.getByRole('status')).toContainText('beta.pdf dropped at position 1.')
  await page.waitForTimeout(150)

  const output = await runAndDownload(page)

  expect(await pageWidths(output)).toEqual([301, 302, 201, 202])
})

test('watermark previews its own output rather than the input', async ({ page }) => {
  await openTool(page, 'watermark', 'Watermark')
  await upload(page, [pdfFile('two.pdf', await createPagedPdf([200, 201]))])

  await expect(page.getByRole('img', { name: 'The result, page 1 of 2' })).toBeVisible({
    timeout: 60_000,
  })
})
