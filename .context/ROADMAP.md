# Roadmap & status

Milestones from PRD §9. Update the Status column as work lands. No dates: this ships when
it ships.

| Milestone | Contents | Status |
|---|---|---|
| **M0 Shell** | Vite/React/Tailwind scaffold, tokens, landing, tool page template, dropzone, worker RPC, PDFium thumbnail rendering, Cloudflare deploy with headers, CSP, zero-egress E2E test | **DONE** |
| **M1 Structural tools** | Merge, Split, Remove, Extract, Organize, Rotate, Page numbers, Watermark, Crop, JPG→PDF, PDF→JPG | **DONE**, all eleven byte-verified in a real browser |
| **Document surfaces** | A thumbnail per input file with drag-to-reorder, the page grid on every single-file tool, and a live preview that runs the real step | **DONE** |
| **Design system** | HeroUI v3 (Tailwind v4 + React Aria) behind the `packages/ui` seam, brand tokens remapped in `tokens.css` | **IN PROGRESS** |
| **M2 Security & forms** | Protect, Unlock, Sign, Redact (rasterizing), Forms fill, Edit (overlays) | **Edit DONE**; the rest **PLANNED**, blocked, see below |
| **M3 Optimize** | Compress, Repair, OCR; Ghostscript gated on D1 | **PLANNED** |
| **M4 v1 launch** | Offline SW, privacy page, licenses page, a11y pass, i18n extraction, copy pass | **PLANNED** |
| **M5 v1.5** | Compare, Forms detect, PDF→Markdown/Word/PowerPoint (lossy badge), Workflows | **PLANNED** |

CI and Deploy are green on `main`
([`ci.yml`](../.github/workflows/ci.yml), [`deploy.yml`](../.github/workflows/deploy.yml)).

## Definition of done per milestone

A milestone is done when, on a clean checkout:

- `pnpm install && pnpm build` succeeds
- `pnpm lint` (Biome) and `pnpm typecheck` (tsc --noEmit, strict) are clean
- `pnpm test` (Vitest) passes, including every tool step's own unit test
- `pnpm e2e` (Playwright) passes, including the zero-egress assertion (NFR-1)
- `pnpm budget` (NFR-5) passes: shell JS < 200 KB gzip, no engine in the shell

## What is next

**1. Finish the HeroUI v3 migration.** In flight, decided in
[DECISIONS.md](./DECISIONS.md) (D8). `packages/ui` is the only seam; app code
imports from `@fuckpdf/ui`, never `@heroui/react`. Binding rules are in
[DESIGN.md](./DESIGN.md). Done when the gate is green and the E2E accessible-name
assertions still pass.

**2. Pick a qpdf-wasm package. This blocks the rest of M2.** Edit shipped ahead of it,
which is the reordering option §2 below already suggested: it needs no new engine.

 Protect and Unlock need encryption, and
neither npm candidate inspires confidence: `qpdf-wasm` 0.1.0 and `@jspawn/qpdf-wasm` 0.0.2
both look unmaintained, as PRD §4.2 already warned. Options, none yet chosen: adopt one and
pin it, build qpdf to wasm ourselves and self-host the artifact, or reorder M2 so the tools
that need no new engine (Sign, Redact, Forms fill, Edit, all PDFium + pdf-lib) ship first
and Protect/Unlock follow. Decide before starting M2; record it in
[DECISIONS.md](./DECISIONS.md).

**3. Disable Network Error Logging on the custom domain.** See the caveat below.

**4. Move the pdf-lib steps into a worker.** AGENTS.md invariant 3 currently holds for
PDFium only; `module.run` is called on the main thread, so a pdf-lib step parses and
writes there. Nothing janks at M1 sizes, but Compress and OCR (M3) will. Cheap to fix,
because the step contract is already pure. See [ARCHITECTURE.md](./ARCHITECTURE.md).

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
- Service Worker / offline (FR-8) is M4 and not started. The README does not claim offline
  support; do not add the claim before the SW exists.
- `/privacy`, `/about` and `/licenses` render a single paragraph each. The real privacy
  page and the generated dependency-licence inventory (NFR-8) are M4.
- `packages/engine-qpdf` does not exist yet. It arrives with M2. See the blocker above.

## Zero-egress: one caveat found on the real edge

The deployed origin returns Cloudflare's own `nel` and `report-to` headers, pointing the
browser at `a.nel.cloudflare.com`. `success_fraction` is `0.0`, so a browser only reports
*network failures*, never a successful visit. It is still a third-party endpoint the
browser may contact, which PRD §4.3's "the only requests a browser makes are to
fuckpdf.reqhiem.dev" does not allow.

It is injected by the edge, not by `public/_headers`, so the app cannot remove it. Network
Error Logging is a zone setting; it cannot be turned off on a `workers.dev` subdomain.

The Playwright zero-egress test cannot catch this: NEL only fires on a network error, which
a passing run never produces. The check is `curl -I` against the deployed origin, and the
acceptance criterion is the header's absence.

**Measured 2026-09-21.** Both `https://fuckpdf.joel-perca.workers.dev` and
`https://fuckpdf.reqhiem.dev` return HTTP 200 with the same ETag (the custom hostname
already serves this build, resolving through Cloudflare) and **both still return `nel`
and `report-to`**. So binding the hostname was not by itself sufficient: the zone-level
Network Error Logging setting still has to be turned off, and whether this account can
turn it off for that hostname is unverified. Note also that `wrangler.jsonc` declares no
`routes` and no `custom_domain`, so however the hostname is attached, it is not in this
repo. Worth writing down wherever it does live.

Until the header is gone, the README states the caveat plainly rather than claiming an
absolute.
