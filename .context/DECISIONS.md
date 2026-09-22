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
