import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const dist = resolve(process.cwd(), 'apps/web/dist')
const budget = Number(process.env.SHELL_BUDGET_BYTES ?? 200 * 1024)

if (!Number.isFinite(budget) || budget < 1) {
  console.error('SHELL_BUDGET_BYTES must be a positive number')
  process.exit(1)
}

const html = await readFile(resolve(dist, 'index.html'), 'utf8')
const assets = [...html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+\.js)["']/g)].map(
  ([, asset]) => asset,
)
const entryAssets = assets.filter((asset) => asset.startsWith('/assets/'))

if (entryAssets.length === 0) {
  console.error('Bundle budget failed: index.html does not load a shell JavaScript asset')
  process.exit(1)
}

for (const asset of entryAssets) {
  const bytes = await readFile(resolve(dist, `.${asset}`))
  const gzipBytes = gzipSync(bytes).byteLength

  if (gzipBytes >= budget) {
    console.error(
      `Bundle budget failed: ${asset} is ${gzipBytes} B gzip (limit ${budget} B; set SHELL_BUDGET_BYTES to override)`,
    )
    process.exit(1)
  }

  if (/pdfium|pdf-lib|pdflib/i.test(asset) || /@embedpdf\/pdfium|pdf-lib/i.test(bytes)) {
    console.error(`Bundle budget failed: engine chunk ${asset} is loaded by index.html`)
    process.exit(1)
  }
}

console.log(
  `Bundle budget passed: ${entryAssets.join(', ')} below ${budget} B gzip; no engine entry chunks`,
)
