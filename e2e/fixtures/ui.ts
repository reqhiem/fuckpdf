// Every locator goes through a role and an accessible name: a control this suite cannot
// address by name is one a screen reader cannot address either.
import { readFile } from 'node:fs/promises'
import { expect, type Page } from '@playwright/test'

export type UploadFile = { name: string; mimeType: string; buffer: Buffer }

export const pdfFile = (name: string, buffer: Buffer): UploadFile => ({
  name,
  mimeType: 'application/pdf',
  buffer,
})

/** The h1 check matters: an unresolved slug silently renders the landing instead. */
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

export async function waitForGrid(page: Page, count: number): Promise<void> {
  await expect(page.getByRole('list', { name: 'Pages' })).toBeVisible({ timeout: 60_000 })
  for (let number = 1; number <= count; number++) {
    await expect(page.getByRole('button', { name: `Page ${number} of ${count}` })).toBeVisible({
      timeout: 60_000,
    })
  }
}

export const pageThumbnail = (page: Page, number: number, total: number) =>
  page.getByRole('button', { name: `Page ${number} of ${total}` })

/** Not `selectOption`: HeroUI's Select is a React Aria listbox, not a native `<select>`. */
export async function chooseOption(page: Page, field: string, option: string): Promise<void> {
  await page.getByRole('button', { name: field }).click()
  const item = page.getByRole('option', { name: option, exact: true })
  await item.click()
  // The popover unmounts on selection; waiting for that stops the next action racing it.
  await expect(item).toBeHidden()
}

/** Single-select React Aria renders the group as a radiogroup, so this clicks a radio. */
export async function chooseToggle(page: Page, group: string, option: string): Promise<void> {
  const radio = page.getByRole('radiogroup', { name: group }).getByRole('radio', { name: option })
  await radio.click()
  await expect(radio).toBeChecked()
}

export async function setNumber(page: Page, label: string, value: string): Promise<void> {
  // Not `getByLabel`: a NumberField labels both stepper buttons with the same text.
  const field = page.getByRole('textbox', { name: label, exact: true })
  await field.fill(value)
  await field.press('Enter')
  await expect(field).toHaveValue(value)
}
