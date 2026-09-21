# Roadmap & status

Milestones from PRD §9. Update the Status column as work lands.

| Milestone | Contents | Status |
|---|---|---|
| **M0 Shell** | Vite/React/Tailwind scaffold, tokens, landing, tool page template, dropzone, worker RPC, PDFium thumbnail rendering, Cloudflare deploy with headers, CSP, zero-egress E2E test | **done** |
| **M1 Structural tools** | Merge, Split, Remove, Extract, Organize, Rotate, Page numbers, Watermark, Crop, JPG→PDF, PDF→JPG | **done**, unverified in a browser per tool |
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

## Known gaps at the end of M0/M1

- Each tool step has a unit test, but only merge/rotate-level behaviour has been exercised
  end to end in a real browser. A per-tool E2E pass is the first M2 task.
- Playwright runs chromium locally; firefox and webkit need host libraries this machine
  does not have, so they are covered by CI (`playwright install --with-deps`) only.
- i18n loads `en` eagerly rather than lazily per locale (PRD §4.1). Irrelevant while `en`
  is the only catalog; revisit when a second locale is filled in.
- Service Worker / offline (FR-8) is M4 and not started.
- `packages/engine-qpdf` does not exist yet. It arrives with M2 (Protect/Unlock). Both
  candidate packages (`qpdf-wasm` 0.1.0, `@jspawn/qpdf-wasm` 0.0.2) look unmaintained —
  verify before committing to one, as PRD §4.2 already warns.
