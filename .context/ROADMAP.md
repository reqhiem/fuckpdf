# Roadmap & status

Milestones from PRD §9. Update the Status column as work lands.

| Milestone | Contents | Status |
|---|---|---|
| **M0 Shell** | Vite/React/Tailwind scaffold, tokens, landing, tool page template, dropzone, worker RPC, PDFium thumbnail rendering, Cloudflare deploy with headers, CSP, zero-egress E2E test | in progress |
| **M1 Structural tools** | Merge, Split, Remove, Extract, Organize, Rotate, Page numbers, Watermark, Crop, JPG→PDF, PDF→JPG | in progress |
| **M2 Security & forms** | Protect, Unlock, Sign, Redact (rasterizing), Forms fill, Edit (overlays) | not started |
| **M3 Optimize** | Compress, Repair, OCR; Ghostscript gated on D1 | not started |
| **M4 v1 launch** | Offline SW, privacy page, licenses page, a11y pass, i18n extraction, copy pass | not started |
| **M5 v1.5** | Compare, Forms detect, PDF→Markdown/Word/PowerPoint (lossy badge), Workflows | not started |

## Definition of done per milestone

A milestone is done when, on a clean checkout:

- `pnpm install && pnpm build` succeeds
- `pnpm lint` (Biome) and `pnpm typecheck` (tsc --noEmit, strict) are clean
- `pnpm test` (Vitest) passes, including every tool step's own unit test
- `pnpm e2e` (Playwright) passes, including the zero-egress assertion (NFR-1)
- the bundle budget check (NFR-5) passes: shell JS < 200 KB gzip, no engine in the shell

## Cut from v1

Per `DECISIONS.md`: Ghostscript/PDF-A (D1), PDF→Excel (D3), SFW mode (D4).
Per PRD §3: Office→PDF, HTML→PDF, Scan to PDF, AI summarize/translate.
