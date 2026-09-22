import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin, runnerImport } from 'vite'

// Mirrors public/_headers so SharedArrayBuffer works in dev too.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

// Cloudflare assets serves /merge from merge.html without a redirect; merge/index.html would 307
// to /merge/, which the router and the canonical URLs do not use.
const prerender = (): Plugin => ({
  name: 'prerender',
  apply: 'build',
  async closeBundle() {
    const dist = join(import.meta.dirname, 'dist')
    const { module: seo } = await runnerImport<{
      ROUTES: string[]
      prerender: (template: string, route: string) => string
      sitemap: () => string
    }>('./src/seo.ts')
    const template = await readFile(join(dist, 'index.html'), 'utf8')
    for (const route of seo.ROUTES) {
      const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`
      await writeFile(join(dist, file), seo.prerender(template, route))
    }
    await writeFile(join(dist, 'sitemap.xml'), seo.sitemap())
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), prerender()],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    // Engines are lazy chunks and must never land in the shell.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@embedpdf/pdfium')) return 'engine-pdfium'
          if (id.includes('pdf-lib')) return 'engine-pdflib'
          return undefined
        },
      },
    },
  },
})
