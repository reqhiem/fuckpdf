# PRD — fuckpdf.reqhiem.dev

**Version:** 0.1 · **Date:** 2026-09-21 · **Owner:** Joel Perca (reqhiem)
**Status:** Draft for implementation

---

## 1. Summary

fuckpdf is a browser-only PDF toolkit. Every operation runs inside the user's browser via WebAssembly and Web Workers. There is no backend, no upload, no analytics, no telemetry, no cookies, no third-party requests. The app is served as a static SPA from Cloudflare Workers (static assets only, no Worker script).

It is a satire of iLovePDF: same job-to-be-done ("I need to do one thing to a PDF, now"), opposite stance on data ("we can't see your files because we never receive them"). Tone is profane and dry; functionality is serious.

Product language is English. The UI is built i18n-ready (string catalogs, locale switch) but ships with `en` only.

**Non-goals (v1):** accounts, payments, file history, cloud storage integrations, AI features, e-signature requests to third parties, mobile native apps, any feature that requires a server.

---

## 2. Reference: iLovePDF tool catalog (as of 2026-09)

Grouped as iLovePDF groups them. This is the checklist the product is measured against.

| Group | Tool |
|---|---|
| Organize | Merge, Split, Remove pages, Extract pages, Organize (reorder/rotate/delete/add), Scan to PDF |
| Optimize | Compress, Repair, OCR |
| Convert to PDF | JPG→PDF, Word→PDF, PowerPoint→PDF, Excel→PDF, HTML→PDF |
| Convert from PDF | PDF→JPG, PDF→Word, PDF→PowerPoint, PDF→Excel, PDF→PDF/A |
| Edit | Rotate, Page numbers, Watermark, Crop, Edit (text/images/shapes/annotations), Forms (detect/fill/create fields) |
| Security | Unlock, Protect, Sign, Redact, Compare |
| PDF Intelligence | Summarize (AI), Translate (AI), PDF→Markdown |
| Meta | Custom workflows (chain tools) |

---

## 3. Feasibility map — what runs in WASM

Ratings: **A** full parity client-side · **B** parity with caveats · **C** degraded/lossy · **X** not feasible without a server or out of scope.

| Tool | Rating | Engine | Notes |
|---|---|---|---|
| Merge | A | pdf-lib | Preserve bookmarks optional (v2). |
| Split (ranges / every N / by size) | A | pdf-lib | "By size" via iterative bisection. |
| Remove pages | A | pdf-lib | |
| Extract pages | A | pdf-lib | Single file or one file per page (zip). |
| Organize (drag reorder, rotate, delete, insert blank/other PDF) | A | pdf-lib + PDFium (thumbnails) | Core UI of the product; other tools reuse its page grid. |
| Rotate | A | pdf-lib | Per page or whole doc. |
| Page numbers | A | pdf-lib | Position, range, start, format `{n}`, `{n} of {total}`, font, size, color, margin. |
| Watermark (text/image) | A | pdf-lib | Opacity, rotation, tiling, layer over/under, page range. |
| Crop | A | pdf-lib (CropBox/MediaBox) | Non-destructive by default; "flatten" option rasterizes via PDFium. |
| JPG/PNG/WebP→PDF | A | canvas + pdf-lib | Orientation, margins, page size, fit mode. HEIC via libheif-wasm (optional, lazy). |
| PDF→JPG/PNG/WebP | A | PDFium | Pages to images at chosen DPI; also "extract embedded images". |
| Protect (password, permissions) | A | qpdf-wasm | AES-256 (R6). User/owner password, permission flags. |
| Unlock (with password) | A | qpdf-wasm / PDFium | Requires the password. No cracking. |
| Compress | B | PDFium (re-render images) + pdf-lib (object streams) · Ghostscript-wasm as optional pass | Image downsampling/recompression is where the bytes are. Ghostscript gives the best ratio but is AGPL and ~15–20 MB; ship as a lazily loaded optional engine. |
| Repair | B | qpdf-wasm (`--qdf`/rewrite), PDFium reload-and-save as fallback | Fixes xref/stream damage; cannot recover truncated files. |
| PDF→PDF/A | C | Ghostscript-wasm | Only real option client-side. PDF/A-2b target. No validator; state "best effort, not verified". |
| OCR | B | tesseract-wasm (fast models) | Produce searchable PDF (invisible text layer over original page) via pdf-lib. English default, language packs lazy-loaded. Slow on large scans; show per-page progress. |
| Forms — fill | A | PDFium | Text, checkbox, radio, combo, list. Save with or without flattening. |
| Forms — create/detect fields | B | pdf-lib (create) · heuristic detection (rectangles + labels) | Auto-detection will be mediocre. Ship manual creation first, detection as "suggest fields". |
| Sign (self) | B | canvas → image → pdf-lib | Draw / type / upload signature; place and scale; date stamp. No cryptographic signature, no request-to-others flow. Label honestly: "visual signature". |
| Redact | B | PDFium (rasterize page) + pdf-lib | v1: draw boxes → page is rasterized and re-embedded (text is destroyed, guaranteed). v2: true content-stream redaction. Do not ship a "redaction" that only draws a black rectangle. |
| Compare | B | PDFium + text diff | Side-by-side with pixel diff overlay and text-level diff. |
| Edit (add text/image/shapes/annotations) | B | PDFium annotations + pdf-lib overlays | Adding content: yes. Editing existing text in place: no (out of scope; be explicit in UI). |
| PDF→Markdown | C | PDFium text extraction + layout heuristics | Headings by font size, lists, simple tables. Lossy; acceptable for an LLM-input use case. |
| PDF→Word (.docx) | C | text/image extraction → `docx` npm | Text flow + images, no faithful layout. Label "lossy". |
| PDF→PowerPoint | C | PDFium render → pptxgenjs | One page = one slide with a full-bleed image plus an invisible text layer? No — just image + notes text. Cheap and honest. |
| PDF→Excel | C/X | table heuristics → SheetJS | Only regular grid tables work. Ship as experimental or defer to v2. |
| Word/Excel/PowerPoint→PDF | C/X | ZetaOffice (LibreOffice WASM, ~300 MB) or `office2pdf` (Rust→wasm, low fidelity) | v1: **out**. v2 candidate as a clearly separate, lazy-loaded "heavy mode". |
| HTML→PDF (URL) | X | — | Needs a fetch of an arbitrary URL (CORS) and a headless renderer. Local `.html` file → PDF via `window.print()` is a trivial v2 add. |
| Scan to PDF | X (v1) | getUserMedia + OpenCV.js | Feasible, but the whole value is the mobile camera UX. v2. |
| Summarize / Translate (AI) | X | — | Requires a model. Out of scope (a WebGPU local LLM is a different product). |
| Workflows (chain tools) | B | internal pipeline | Free design win: every tool is a pure `(Uint8Array[], options) → Uint8Array[]` step, so chaining is a UI concern. v1.5. |

**v1 scope = every A and B row except Forms-detect and Compare** (those go to v1.5). C rows ship behind an "Experimental / lossy" badge in v1.5. X rows are excluded.

---

## 4. Stack

### 4.1 Application

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | |
| Build | Vite 7 | Native worker bundling, `?url` wasm imports, code-splitting per tool. |
| UI | React 19 | Matches reqhiem.dev; large ecosystem for drag-and-drop. |
| Routing | React Router (data router, lazy routes) | One route per tool: `/merge`, `/split`, … `/:locale/merge` reserved for i18n. |
| Styling | Tailwind CSS v4 (`@theme` tokens) | Same setup as reqhiem.dev; tokens in §6. |
| Icons | lucide-react | Same as reqhiem.dev. |
| State | Zustand (per-tool store) + URL state for options | No global app state beyond theme/locale. |
| i18n | i18next + react-i18next, ICU message format, lazy JSON per locale | `en` shipped; `es`, `pt-BR` catalogs scaffolded but empty. |
| Drag & drop | dnd-kit | Page grid reorder, file list reorder. |
| Zip | fflate | Multi-file outputs. |
| Worker RPC | Comlink | One dedicated Web Worker per engine; main thread never touches PDF bytes beyond transfer. |
| Testing | Vitest (unit, engine adapters in Node), Playwright (E2E on real browsers, fixture PDFs) | Engine adapters must run under Node for CI. |
| Lint/format | Biome | |
| Package manager | pnpm | |

### 4.2 Engines (all lazy-loaded per tool, cached via Service Worker)

| Engine | Package | License | Size (approx., gzip) | Used for |
|---|---|---|---|---|
| PDFium | `@embedpdf/pdfium` (+ `@embedpdf/engines`) | MIT wrapper / BSD PDFium | ~3–4 MB | Rendering, thumbnails, text extraction, forms, annotations, image extraction, unlock. |
| pdf-lib | `pdf-lib` (pure JS) | MIT | ~250 KB | All structural edits: merge, split, rotate, crop boxes, watermark, page numbers, overlays, invisible OCR text layer. |
| qpdf | `qpdf-wasm` (or `@jspawn/qpdf-wasm`; verify maintenance at implementation time) | Apache-2.0 | ~1.5 MB | Encrypt/decrypt, repair, linearize, object streams. |
| Tesseract | `tesseract-wasm` + `tessdata_fast` models | Apache-2.0 | ~2 MB core + ~2–10 MB per language | OCR. |
| Ghostscript | community `gs.wasm` build (pinned, self-hosted) | **AGPL-3.0** | ~15–20 MB | Optional engine: aggressive compress presets, PDF/A. Loaded only when the user picks it. Repository must be AGPL-compatible (see §8). |
| docx / pptxgenjs / SheetJS | npm | MIT / MIT / Apache-2.0 | small | Lossy exports (v1.5). |

**Rule:** PDFium is the only renderer. MuPDF is explicitly not used (AGPL, redundant with PDFium + pdf-lib).

### 4.3 Hosting — Cloudflare Workers (static assets only)

- `wrangler.jsonc`: `assets.directory = "./dist"`, `assets.not_found_handling = "single-page-application"`, **no `main`** — zero Worker invocations, zero server code.
- `public/_headers`:
  - `/*` → `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp` (enables SharedArrayBuffer for threaded wasm), strict CSP (`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; img-src 'self' blob: data:; font-src 'self'; worker-src 'self' blob:`), `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal (camera reserved for v2 scan).
  - `/assets/*` and `/wasm/*` → `Cache-Control: public, max-age=31536000, immutable` (content-hashed filenames).
  - `/index.html` → `Cache-Control: no-cache`.
- Custom domain `fuckpdf.reqhiem.dev` bound to the Worker. DNS for `reqhiem.dev` stays where it is (Vercel site untouched); only the subdomain CNAMEs to Cloudflare.
- Deploy: GitHub Actions → `wrangler deploy` on `main`; preview deploys on PRs via Workers preview URLs.
- Cloudflare Web Analytics, Speed Insights and any beacon are **off**. The only requests a browser makes are to `fuckpdf.reqhiem.dev`.
- Service Worker (Workbox, `vite-plugin-pwa`) precaches the shell and caches engine binaries on first use → the app works offline after the first visit. This is a feature and is stated in the UI.

---

## 5. Requirements

### 5.1 Functional — shared shell

- **FR-1 Landing:** grid of all tools, grouped as in §2; each card has icon, name, one-line description, and rating badge where lossy/experimental. Search/filter by name.
- **FR-2 Tool page:** dropzone (click, drag, paste, multi-file where the tool allows) → options panel → run → results panel with download (single file or zip), file size before/after, and "start over". Same layout for every tool.
- **FR-3 Input limits:** soft warning at 100 MB total, hard stop at 500 MB or when `navigator.deviceMemory` suggests risk. Message is honest about browser memory.
- **FR-4 Progress:** per-file and per-page progress, cancellable; engines run in workers so the UI never freezes.
- **FR-5 Encrypted inputs:** any tool that receives an encrypted PDF prompts for the password inline instead of failing.
- **FR-6 Output naming:** `<original>-<tool>.pdf` for single outputs; `fuckpdf-<tool>-<timestamp>.zip` for bundles.
- **FR-7 Privacy panel:** a persistent footer statement plus a `/privacy` route explaining exactly what happens (nothing leaves the browser; how to verify with DevTools Network tab; offline capability).
- **FR-8 Offline:** after first load, all previously used tools work with no network.
- **FR-9 Theme:** light/dark, follows system, manual override persisted in `localStorage` (the only persisted state besides locale).
- **FR-10 i18n:** all UI strings in catalogs; locale switch in footer; `en` only at launch. Profanity is part of the copy and must be translatable, not hard-coded in components.
- **FR-11 Keyboard & a11y:** every tool operable by keyboard; focus rings use the accent color; page thumbnails have alt text (`Page 3 of 12`); WCAG AA contrast on both themes.
- **FR-12 Workflows (v1.5):** chain up to 5 tools; each step's options editable; saved locally as JSON; export/import.

### 5.2 Functional — per tool (v1)

Each tool is a pure step: `run(inputs: PdfInput[], options): Promise<Output[]>`. Options below are the minimum.

- **Merge:** reorder files; optional page-range per file; output one PDF.
- **Split:** modes = custom ranges, every N pages, extract all pages, by max file size; output zip or single.
- **Remove / Extract pages:** page picker grid with multi-select and range text input.
- **Organize:** thumbnail grid; drag reorder; per-page rotate/delete/duplicate; insert blank page; insert pages from another PDF; output one PDF.
- **Rotate:** 90/180/270; all pages or selection.
- **Compress:** presets `light / balanced / brutal` (map to image DPI + JPEG quality + object streams); optional "Ghostscript pass" toggle that lazy-loads the AGPL engine with a one-time notice; show before/after size and %.
- **Repair:** run qpdf rewrite; if it fails, PDFium load+save; report what was done.
- **OCR:** language(s) selection; output searchable PDF (original pixels preserved, invisible text layer); optional `.txt` sidecar; per-page progress.
- **JPG→PDF:** page size (A4/Letter/fit image), orientation, margin, one image per page or auto-fit; drag reorder.
- **PDF→JPG:** pages or embedded images; format JPG/PNG/WebP; DPI 72–300; zip output.
- **Page numbers:** position (9 anchors), first number, range, format template, font (Space Grotesk / Helvetica / Times), size, color; live preview on page 1.
- **Watermark:** text or image; position/tiled; opacity; rotation; over/under content; range; live preview.
- **Crop:** draw rectangle on preview; apply to page/selection/all; toggle `flatten` (rasterize) vs box-only.
- **Protect:** open password, permissions password, permission checkboxes (print, copy, modify, annotate); AES-256.
- **Unlock:** password prompt; remove encryption; state clearly it does not crack passwords.
- **Sign:** draw (pointer/touch), type (3 fonts), upload PNG; place/scale/rotate on any page; optional date; flatten into page.
- **Redact:** draw boxes on pages; apply → affected pages rasterized at 200 DPI with boxes burned in, text/images of those pages destroyed; unaffected pages untouched; confirmation dialog explains this.
- **Forms — fill:** render fields via PDFium; edit; save (keep interactive) or flatten.
- **Edit:** add text box, image, rectangle/ellipse/line, freehand ink, highlight; move/resize/delete; flatten on export. Existing text is not editable — UI says so.
- **PDF→Markdown (v1.5):** headings by font size ranking, bullets, simple tables, image placeholders; download `.md`.
- **Compare (v1.5):** two inputs; synchronized side-by-side; pixel diff overlay toggle; text diff list.

### 5.3 Non-functional

- **NFR-1 Zero egress:** CSP `connect-src 'self'`; CI test asserts no request leaves the origin during a full E2E run (Playwright network log).
- **NFR-2 Performance:** landing LCP < 1.5 s on 4G; tool page interactive before its engine finishes loading (engine loads on dropzone hover/first file); 100-page merge < 2 s on a 2022 laptop; render of a thumbnail < 100 ms/page.
- **NFR-3 Memory:** stream outputs as `Blob`s; release engine documents after each run; no `ArrayBuffer` copies across worker boundary (transfer).
- **NFR-4 Browser support:** last 2 versions of Chrome, Edge, Firefox, Safari (desktop and iOS). Threaded wasm degrades to single-thread when COOP/COEP unavailable.
- **NFR-5 Bundle budget:** shell JS < 200 KB gzip; each tool chunk < 100 KB excluding engines; engines never in the shell.
- **NFR-6 Determinism:** same input + options → byte-identical output where the engine allows (set fixed `CreationDate`/`ID` when user enables "reproducible").
- **NFR-7 Errors:** every failure surfaces a human message plus a copyable technical detail; nothing is reported anywhere.
- **NFR-8 Licensing:** dependency license inventory generated at build; AGPL engine isolated in its own chunk and documented (§8).

### 5.4 Acceptance criteria (representative)

- Dropping a 300-page, 80 MB scanned PDF into Compress with `balanced` returns a file ≥ 40% smaller in < 60 s on a mid-range laptop, with the UI responsive throughout.
- Protect → Unlock round-trip yields a file PDFium opens without password and `qpdf --check` passes.
- OCR on a 10-page English scan produces a PDF in which `Ctrl+F` finds a known word on every page and the visual output is pixel-identical to the input pages.
- Redact output, opened in any viewer, exposes no text under the boxes (verified by text extraction in E2E).
- With DevTools Network open and "Disable cache" off, running any tool after first load produces zero network requests.

---

## 6. Visual identity

Derived from reqhiem.dev (`src/app/globals.css`). Same tokens, harsher voice.

### 6.1 Tokens (Tailwind v4 `@theme`)

```css
--font-sans: "Space Grotesk", "Segoe UI", system-ui, sans-serif;   /* self-hosted via @fontsource/space-grotesk, weights 300–700 */
--font-mono: "JetBrains Mono", ui-monospace, monospace;             /* file names, sizes, technical detail */

--color-ink:           #0b0f14;   /* text (light), background (dark) */
--color-paper:         #f6f4ef;   /* background (light), text (dark) */
--color-muted:         #9aa0a8;
--color-accent:        #ff5a36;   /* primary actions, focus ring, progress */
--color-surface:       #141a21;   /* dark cards */
--color-surface-muted: #1b222b;
--color-danger:        #e5484d;   /* destructive confirmations (redact, delete pages) */
--color-ok:            #3ecf8e;   /* success state */
```

- Dark mode via `.dark` class on `<html>` (`@custom-variant dark (&:where(.dark, .dark *))`), `color-scheme: light dark`.
- Background: paper/ink solid + the two fixed radial washes from the site (`rgba(255,90,54,0.12)` top-left, `rgba(18,32,66,0.12)` top-right; stronger in dark). Optional 56 px schematic grid (`.hero-grid`) on the landing hero only.
- Surfaces: `rounded-2xl border border-black/10 bg-white/80 backdrop-blur` (dark: `border-white/10 bg-white/5`).
- Focus: `outline: 2px solid var(--color-accent); outline-offset: 2px`.
- Motion: 0.6 s `cubic-bezier(0.22,1,0.36,1)` reveals; respect `prefers-reduced-motion` (disable, don't pause).

### 6.2 Layout & type

- Container `max-w-7xl px-6`. Landing hero: tiny uppercase tracking-wide kicker (muted), oversized H1 (Space Grotesk 700, tight letter-spacing, weight contrast like "AI Engineer **+** Researcher"), one-sentence dek, two buttons (accent solid, ghost).
- Tool cards: surface, icon (lucide, 20 px, accent on hover), name (600), one line muted description. Hover: translate-y -2 px, border → accent/40.
- Tool page: two columns ≥ lg (preview/pages left, options right, sticky run button), single column below.
- Numbers, file sizes, page counts in mono.

### 6.3 Voice

- Product name always lowercase `fuckpdf`. Wordmark: `fuck` in ink, `pdf` in accent, Space Grotesk 700.
- Tagline candidates: "Your files never leave your browser. Neither does your dignity." / "PDF tools. No upload. No account. No bullshit."
- Headings are profane and dry; option labels, errors and privacy text are plain and precise. Never joke inside a destructive confirmation.
- Never mention iLovePDF by name in product copy or markup; no lookalike logo, colors (their red/heart), or slogans. Satire lives in the name and tone, not in trade dress.
- Empty state example: "Drop a PDF. Or ten. We're not counting, we literally can't."
- Error example: "This file is broken in a way we can't fix. Try Repair, then try lower expectations."

---

## 7. Information architecture

```
/                      landing (all tools)
/merge /split /remove-pages /extract-pages /organize /rotate
/compress /repair /ocr
/jpg-to-pdf /pdf-to-jpg
/page-numbers /watermark /crop /edit /forms
/protect /unlock /sign /redact
/compare /pdf-to-markdown /pdf-to-word /pdf-to-powerpoint /pdf-to-excel   (v1.5, badged)
/workflows             (v1.5)
/privacy  /about  /licenses
```

Repo layout (monorepo, pnpm workspaces): `apps/web` (SPA), `packages/engine-*` (one adapter per engine, Node-testable), `packages/tools` (pure tool steps), `packages/ui` (design system), `e2e/`.

---

## 8. Licensing & legal notes

- Default build is MIT-compatible: PDFium (BSD), pdf-lib (MIT), qpdf (Apache-2.0), tesseract (Apache-2.0).
- Ghostscript-wasm is AGPL-3.0. Two acceptable postures: (a) license the whole repository AGPL-3.0 and publish source (recommended for a personal satire project), or (b) exclude Ghostscript and accept weaker compression/no PDF/A. Decide before the first Ghostscript commit; the engine chunk is isolated either way.
- `/licenses` route lists every dependency and license, generated at build.
- Trademark: "iLovePDF" is a registered mark. Parody of the name and stance is defensible; copying UI, logo or slogans is not. §6.3 rules apply.
- Fonts: Space Grotesk (OFL), JetBrains Mono (OFL), self-hosted.

---

## 9. Milestones

| Milestone | Contents |
|---|---|
| **M0 Shell** | Vite/React/Tailwind scaffold, tokens, landing, tool page template, dropzone, worker RPC, PDFium thumbnail rendering, Cloudflare deploy with headers, CSP, zero-egress E2E test. |
| **M1 Structural tools** | Merge, Split, Remove, Extract, Organize, Rotate, Page numbers, Watermark, Crop, JPG→PDF, PDF→JPG. |
| **M2 Security & forms** | Protect, Unlock, Sign, Redact (rasterizing), Forms fill, Edit (overlays). |
| **M3 Optimize** | Compress (PDFium/pdf-lib path), Repair, OCR; optional Ghostscript engine + PDF/A behind license decision. |
| **M4 v1 launch** | Offline SW, privacy page, licenses page, a11y pass, i18n catalogs extracted, copy pass. |
| **M5 v1.5** | Compare, Forms detect, PDF→Markdown/Word/PowerPoint (lossy badge), Workflows. |

---

## 10. Open decisions

1. AGPL posture for Ghostscript (§8) — blocks M3 second half.
2. Redaction: accept rasterizing redaction for v1, or hold the tool until true content-stream redaction exists.
3. Whether PDF→Excel ships at all.
4. Whether a "SFW mode" toggle (same tools, tamer copy) is worth the string duplication — recommend no for v1.
