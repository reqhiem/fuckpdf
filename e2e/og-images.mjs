// Renders the 1200×630 share images into apps/web/public/og/. Run: node e2e/og-images.mjs
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('..', import.meta.url))
const en = JSON.parse(readFileSync(`${root}apps/web/src/locales/en.json`, 'utf8'))
const fonts = `${root}apps/web/node_modules/@fontsource/space-grotesk/files`
const out = `${root}apps/web/public/og`
const page = `${out}/.template.html`

const text = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])

const html = (title, lead, mark) => `<!doctype html><style>
@font-face { font-family: SG; font-weight: 500; src: url(${fonts}/space-grotesk-latin-500-normal.woff2); }
@font-face { font-family: SG; font-weight: 700; src: url(${fonts}/space-grotesk-latin-700-normal.woff2); }
* { margin: 0 }
body { width: 1200px; height: 630px; box-sizing: border-box; padding: 72px 80px; font-family: SG;
  color: #f6f4ef; background: #0b0f14; display: flex; flex-direction: column; justify-content: space-between;
  background-image: radial-gradient(900px 600px at 0% 0%, rgb(255 90 54 / 0.22), transparent 60%),
    linear-gradient(to right, rgb(246 244 239 / 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(246 244 239 / 0.05) 1px, transparent 1px);
  background-size: auto, 56px 56px, 56px 56px; }
.mark { font-size: 44px; font-weight: 700; letter-spacing: -0.04em }
.mark b, h1 b { color: #ff5a36 }
h1 { font-size: 104px; font-weight: 700; letter-spacing: -0.045em; line-height: 1 }
p { margin-top: 28px; font-size: 38px; font-weight: 500; color: #b4b9c2; max-width: 960px; line-height: 1.25 }
.foot { font-size: 28px; font-weight: 500; color: #b4b9c2 }
</style><div class="mark">${mark ? `${en.brand.fuck}<b>${en.brand.pdf}</b>` : ''}</div>
<div><h1>${title}</h1><p>${text(lead)}</p></div>
<div class="foot">${text(en.seo.privacy ?? '')}</div>`

const images = [
  ['home', `${en.brand.fuck}<b>${en.brand.pdf}</b>`, en.landing.dek],
  ...Object.entries(en.tools).map(([id, t]) => [id, text(t.name), t.description]),
]

mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const [key, title, lead] of images) {
  writeFileSync(page, html(title, lead, key !== 'home'))
  await tab.goto(`file://${page}`)
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path: `${out}/${key}.png` })
}
await browser.close()
rmSync(page)
