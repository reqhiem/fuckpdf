import { readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createServer, defineConfig, type Plugin } from 'vite'

// Mirrors public/_headers so SharedArrayBuffer works in dev too.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}
// Preview only, so e2e runs under the production CSP. Dev would break on the React refresh
// preamble, which is an inline script.
const csp = readFileSync(join(import.meta.dirname, 'public/_headers'), 'utf8').match(
  /Content-Security-Policy: (.+)/,
)?.[1]

// Cloudflare assets serves /merge from merge.html without a redirect; merge/index.html would 307
// to /merge/, which the router and the canonical URLs do not use.
const prerender = (): Plugin => ({
  name: 'prerender',
  apply: 'build',
  async closeBundle() {
    const dist = join(import.meta.dirname, 'dist')
    // A live server rather than runnerImport: the render awaits lazy imports after the entry
    // module has loaded, and runnerImport closes its runner as soon as the import resolves.
    const server = await createServer({
      configFile: false,
      root: import.meta.dirname,
      logLevel: 'error',
      appType: 'custom',
      server: { middlewareMode: true, hmr: false, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
    })
    try {
      const seo = (await server.ssrLoadModule('/src/seo.ts')) as {
        ROUTES: string[]
        prerender: (template: string, route: string, body: string) => string
        sitemap: () => string
      }
      const { renderRoute } = (await server.ssrLoadModule('/src/prerender.tsx')) as {
        renderRoute: (route: string) => Promise<string>
      }
      const template = await readFile(join(dist, 'index.html'), 'utf8')
      for (const route of seo.ROUTES) {
        const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`
        await writeFile(join(dist, file), seo.prerender(template, route, await renderRoute(route)))
      }
      await writeFile(join(dist, 'sitemap.xml'), seo.sitemap())
    } finally {
      await server.close()
    }
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), prerender()],
  server: { headers: crossOriginIsolation },
  preview: { headers: { ...crossOriginIsolation, 'Content-Security-Policy': csp ?? '' } },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    // Small font subsets would otherwise inline as data: URLs, which `font-src 'self'` blocks.
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
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
