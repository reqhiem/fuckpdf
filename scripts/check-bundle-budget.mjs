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

// Detected by a symbol, not by the package name: the shell's privacy copy names PDFium
// and pdf-lib in prose, so a name match fails on an app behaving correctly.
const ENGINE_SYMBOLS = [
  { symbol: 'PDFDocument', engine: 'pdf-lib' },
  { symbol: 'FPDF_', engine: 'PDFium' },
]

let total = 0

for (const asset of entryAssets) {
  const bytes = await readFile(resolve(dist, `.${asset}`))
  total += gzipSync(bytes).byteLength

  const text = bytes.toString('utf8')
  for (const { symbol, engine } of ENGINE_SYMBOLS) {
    if (text.includes(symbol)) {
      console.error(
        `Bundle budget failed: ${asset} is loaded by index.html and contains ${engine} code (found ${symbol})`,
      )
      process.exit(1)
    }
  }
}

// The sum, not each asset: what matters is everything the browser fetches to boot.
if (total >= budget) {
  console.error(
    `Bundle budget failed: the shell is ${total} B gzip across ${entryAssets.length} asset(s) (limit ${budget} B; set SHELL_BUDGET_BYTES to override)`,
  )
  process.exit(1)
}

console.log(
  `Bundle budget passed: shell is ${total} B gzip across ${entryAssets.length} asset(s), under ${budget} B; no engine code in it`,
)
