# Decision log

Resolutions for PRD §10 plus decisions taken during implementation.
Each entry: status, date, rationale, what it blocks.

| # | Decision | Status | Date |
|---|---|---|---|
| D1 | Ghostscript / AGPL posture | **Deferred to M3** | 2026-09-21 |
| D2 | Rasterizing redaction in v1 | **Accepted** | 2026-09-21 |
| D3 | PDF→Excel | **Cut from v1 and v1.5** | 2026-09-21 |
| D4 | "SFW mode" toggle | **No** | 2026-09-21 |
| D5 | Repo license | **MIT** (v1) | 2026-09-21 |
| D6 | Monorepo layout per PRD §7 | **Accepted, two packages dropped** | 2026-09-21 |
| D7 | Vite 8 / TypeScript 6 instead of Vite 7 | **Accepted** | 2026-09-21 |
| D10 | Result in the sidebar, discarded on any change | **Accepted** | 2026-09-22 |

---

## D1 — Ghostscript / AGPL (PRD §10.1, §8)

**Deferred.** v1 ships PRD §8 posture (b): no Ghostscript, no PDF/A. Compress uses the
PDFium re-render + pdf-lib object-stream path only. The decision is revisited at the start
of M3 with a real measurement of the non-Ghostscript compression ratio; if it misses the
§5.4 acceptance criterion (≥ 40% on a scanned PDF) the repo relicenses to AGPL-3.0 and the
engine ships in an isolated lazy chunk.

Blocks: second half of M3. Blocks nothing in M0–M2.

## D2 — Redaction (PRD §10.2)

**Accepted as specified in PRD §3/§5.2.** v1 rasterizes affected pages at 200 DPI with
boxes burned in. This destroys text on those pages, which is the point. Unaffected pages
are untouched. A confirmation dialog states the tradeoff in plain language (no jokes —
PRD §6.3). True content-stream redaction stays a v2 item.

## D3 — PDF→Excel (PRD §10.3)

**Cut.** Table heuristics only work on regular grid tables; the failure mode is silent
garbage, which is worse than not shipping. Not in v1, not in v1.5. Revisit never unless a
credible extractor appears.

## D4 — SFW mode (PRD §10.4)

**No.** Doubles every string catalog for a hypothetical user. PRD's own recommendation.

## D5 — Repo license

**MIT**, matching the default engine set (PDFium BSD, pdf-lib MIT, qpdf Apache-2.0,
tesseract Apache-2.0). Coupled to D1: an AGPL relicense is a single-author change if D1
flips.

## D6 — Monorepo layout

PRD §7 specifies `apps/web`, `packages/engine-*`, `packages/tools`, `packages/ui`, `e2e/`.
Kept. `packages/*` start thin — no abstraction until a second consumer exists. The split
earns its keep because engine adapters and tool steps must run under Node in CI without a
DOM (PRD §4.1 testing row), which is the actual reason for the boundary.


## D7 — Vite 8 and TypeScript 6

PRD §4.1 says Vite 7. `pnpm create vite` now scaffolds Vite 8 with TypeScript 6, which
carries every capability the PRD picked Vite 7 for (worker bundling, `?url` wasm imports,
per-tool code splitting) and is the version that will actually receive fixes. Taken as
written rather than downgraded.

## D6 addendum — packages that were not created

`packages/engine-pdflib` was dropped: pdf-lib is already pure JS and Node-testable, so an
adapter around it would have been a wrapper with one implementation and no second consumer.
`packages/tools` imports `pdf-lib` directly. `packages/engine-qpdf` is deferred to M2, when
there is something to put in it.

`packages/engine-pdfium` earns its boundary: wasm instantiation, document lifetime and
memory release are real, and the same contract is implemented twice — in-process for Node
tests, and over a Web Worker for the browser (`apps/web/src/workers/engine.ts`).

## D8 — HeroUI v3 as the design system

The hand-rolled primitives in `packages/ui` were about 200 lines carrying a Button, a Card,
a Badge, a Dialog and a Progress bar. They looked plain and, more importantly, they were
accumulating accessibility debt: a nameless link, then nine nameless toggle buttons, both
caught late. Every one of those is a solved problem in React Aria.

Adopted **HeroUI v3** (Tailwind v4 + React Aria Components). It fits the stack exactly:
Tailwind v4 with `@theme` and no config file is what this repo already does, and React Aria
gives keyboard behaviour, focus management and ARIA wiring that were being written by hand.

Not v2, which is a different library: no provider, no framer-motion, compound components,
`onPress` over `onClick`.

**Brand identity is preserved, not replaced.** The shipped palette (ink, paper, the orange
accent) stays; it is applied by remapping HeroUI's semantic CSS variables in
`apps/web/src/styles/tokens.css`. No component overrides HeroUI's own classes, so there is
one bridge file instead of a per-component skin.

Costs accepted:

- All 72 components' CSS ships, because `@heroui/styles` is one stylesheet. Measured at
  39 KB gzip for the lot. Importing 20 individual component stylesheets to save part of
  that would trade one import line for a maintenance trap where adding a component
  silently ships it unstyled. Not worth it.
- `packages/ui` is now a re-export seam rather than an implementation. App code imports
  from `@fuckpdf/ui`, never `@heroui/react`, so there is still one list of what is in the
  system.

**Known consequence for the test suite:** HeroUI's `Select` is a React Aria listbox, not a
native `<select>`, so Playwright's `selectOption()` no longer drives it. The four affected
tests go through a `chooseOption` helper in `e2e/fixtures/ui.ts` that opens the trigger by
label and picks the option by its visible name. That is a stricter assertion than before,
not a weaker one: it only passes if the control is reachable by accessible name.

## D9 — The preview is the tool's own output, and Zustand is only the editor's

**Decided.** Two things the visual layer could have been built with, and were not.

**A live preview runs the real step.** Page numbers, watermark and crop all want to show
the user what they are about to get. The obvious way is to re-draw each tool's geometry in
CSS on top of a thumbnail. That is a second implementation of every tool, and it starts
drifting from the first one the day either changes — a preview that quietly lies is worse
than no preview at all. Instead `LivePreview` runs `module.run` on the real input,
debounced and cancellable, and renders page 1 of the actual output. One component covers
every form-driven tool, and it cannot disagree with the step because it *is* the step.

Costs accepted: a full parse and write per option change. Bounded by a 15 MB threshold,
above which the preview shows page 1 of the input and says so in the caption. Naming which
document is on screen is not optional — a stale preview presented as live is how someone
ships the wrong file.

**Zustand earns its place in the editor and nowhere else.** It has been a dependency since
M0 and was never used; `ToolPage` runs on plain `useState` and still does. The editor is
the first case that cannot: its canvas and its inspector are two separately lazy-loaded
trees in different regions of the page, so they cannot share selection state through props.
A module-level store is what makes that work. Drag state deliberately stays out of it —
in-flight geometry lives in local state and lands on pointerup, because a store write per
`pointermove` re-renders the element list on every frame.

## D10 — The result lives next to Run, and dies with its inputs

**Decided.** PRD FR-2 says "options panel → run → results panel" and the first layout read
that literally as a vertical order, which put the result above the document once it
arrived and pushed the pages down. The result now appears in the sidebar under the Run
button, where the user is already looking, and the work surface does not move.

A result is cleared when files, options, page order, selection, crop or editor elements
change. Keeping it would leave a Download button for a document that no longer matches the
screen. Run again is only offered while nothing has changed.

Also taken in the same pass: remove-pages and extract-pages keep Run disabled until a page
is selected, because an empty selection reaches the step as "" and the step reads that as
every page. Crop sends the grid selection as `pages`, and a drawn crop box writes its
numbers into the form, so the fields and the page never disagree. Crop's Flatten switch was
removed; the step's flatten path throws on every call.

## D11 — Every route is the real app, prerendered and hydrated

**Decided.** The build used to put a plain-text summary into `#root` for crawlers. On 3G that
summary was the page for seconds, CSS applied and unstyled-looking, until React replaced it.
Now `vite build` renders each route in `ROUTES` with `react-dom/static` and the router's
static handler (`src/prerender.tsx`), and `main.tsx` hydrates it. The first paint is the
page itself.

Rules that keep it working:

- Nothing rendered may differ between the build and the browser's first render. Browser
  state (theme, storage, viewport) is read in effects, as `Shell` already does.
  `e2e/tests/prerender.spec.ts` fails on any hydration error.
- No inline scripts beyond the theme boot script in `index.html`. That one runs before
  paint so dark mode does not flash light, and it is allowed by its `sha256` in `_headers`.
  Editing it means updating the hash; `theme-boot.test.ts` fails otherwise.
- No top-level `await` in `main.tsx`. It turns every shared module into its own chunk.
