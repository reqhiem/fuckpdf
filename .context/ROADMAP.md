# Roadmap & status

Milestones from PRD §9. Update the Status column as work lands.

| Milestone | Contents | Status |
|---|---|---|
| **M0 Shell** | Vite/React/Tailwind scaffold, tokens, landing, tool page template, dropzone, worker RPC, PDFium thumbnail rendering, Cloudflare deploy with headers, CSP, zero-egress E2E test | **done** |
| **M1 Structural tools** | Merge, Split, Remove, Extract, Organize, Rotate, Page numbers, Watermark, Crop, JPG→PDF, PDF→JPG | **done**, all eleven byte-verified in a browser |
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

- All eleven M1 tools are driven through the real UI in `e2e/tests/tools.spec.ts` and
  asserted against the downloaded bytes.
- Playwright runs chromium locally; firefox and webkit need host libraries this machine
  does not have, so they are covered by CI (`playwright install --with-deps`) only.
- i18n loads `en` eagerly rather than lazily per locale (PRD §4.1). Irrelevant while `en`
  is the only catalog; revisit when a second locale is filled in.
- Service Worker / offline (FR-8) is M4 and not started.
- `packages/engine-qpdf` does not exist yet. It arrives with M2 (Protect/Unlock). Both
  candidate packages (`qpdf-wasm` 0.1.0, `@jspawn/qpdf-wasm` 0.0.2) look unmaintained —
  verify before committing to one, as PRD §4.2 already warns.

## Zero-egress: one caveat found on the real edge

The deployed origin returns Cloudflare's own `nel` and `report-to` headers, pointing the
browser at `a.nel.cloudflare.com`. `success_fraction` is `0.0`, so a browser only reports
*network failures*, never a successful visit — but it is still a third-party endpoint the
browser may contact, which PRD §4.3's "the only requests a browser makes are to
fuckpdf.reqhiem.dev" does not allow.

It is injected by the edge, not by `public/_headers`, so the app cannot remove it. Network
Error Logging is a zone setting; it can be turned off once `fuckpdf.reqhiem.dev` is bound
to a zone we control, and cannot be turned off on a `workers.dev` subdomain.

The Playwright zero-egress test cannot catch this: NEL only fires on a network error, which
a passing run never produces. Verify it with `curl -I` against the deployed origin after the
custom domain is bound, and treat the header's absence as the acceptance criterion.
