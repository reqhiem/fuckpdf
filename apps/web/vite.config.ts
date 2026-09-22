import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Mirrors public/_headers so SharedArrayBuffer works in dev too.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
