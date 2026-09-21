/**
 * Driving the real tool page: dropzone → options → Run → Download.
 *
 * Every locator here goes through a role and an accessible name. That is not a style
 * preference — a control this suite cannot address by name is a control a screen reader
 * cannot address either (PRD FR-11), and reaching past it with a CSS selector would hide
 * exactly the defect the suite is supposed to catch.
 */
import { readFile } from 'node:fs/promises'
import { expect, type Page } from '@playwright/test'

export type UploadFile = { name: string; mimeType: string; buffer: Buffer }

export const pdfFile = (name: string, buffer: Buffer): UploadFile => ({
  name,
  mimeType: 'application/pdf',
  buffer,
})

/**
 * Opens a tool route and proves it really is the tool page.
 *
 * The h1 check is the point: routes are literal slugs, and when the page fails to resolve
 * its slug it silently renders the landing instead — which every assertion further down
 * would then fail against for the wrong reason.
 */
export async function openTool(page: Page, slug: string, title: string): Promise<void> {
  await page.goto(`/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
}

export async function upload(page: Page, files: UploadFile[]): Promise<void> {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /^Drop files here/ }).click(),
  ])
  await chooser.setFiles(files)
  for (const file of files) await expect(page.getByText(file.name, { exact: true })).toBeVisible()
}

/** Runs the tool, downloads the result, and hands back the bytes the user would get. */
export async function runAndDownload(page: Page): Promise<Buffer> {
  await page.getByRole('button', { name: 'Run tool' }).click()
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 120_000 })

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  const path = await download.path()
  return readFile(path)
}

/** Waits for the page grid to finish rendering `count` thumbnails in the PDFium worker. */
export async function waitForGrid(page: Page, count: number): Promise<void> {
  await expect(page.getByRole('list', { name: 'Pages' })).toBeVisible({ timeout: 60_000 })
  for (let number = 1; number <= count; number++) {
    await expect(page.getByRole('button', { name: `Page ${number} of ${count}` })).toBeVisible({
      timeout: 60_000,
    })
  }
}

/** The grid's thumbnail button for a page, which is also its selection control. */
export const pageThumbnail = (page: Page, number: number, total: number) =>
  page.getByRole('button', { name: `Page ${number} of ${total}` })
