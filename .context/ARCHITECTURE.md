# ARCHITECTURE.md: fuckpdf

What is actually in the repo, and why it is shaped this way. The spec is
[PRD.md](./PRD.md); the invariants are in [AGENTS.md](../AGENTS.md); settled trade-offs are
in [DECISIONS.md](./DECISIONS.md). This file describes the code as it stands, including
the places where it does not yet match the invariants.

## The path a file takes

Nothing here is a framework. It is five hops, and every hop is one file.

```
  <Dropzone>                       packages/ui/src/index.tsx
      │  File[]
      ▼
  ToolPage.select()                apps/web/src/tool/ToolPage.tsx
      │  size limits, then File.arrayBuffer()
      ▼
  module.run(inputs, options, ctx) packages/tools/src/<tool>.ts
      │
      ├── pdf-lib ──────────────── structural edits, in-process
      │
      └── engine / encode ──────── apps/web/src/workers/engine.ts
              │  Comlink, ArrayBuffer transferred
              ▼
          pdfium.worker.ts ─────── @fuckpdf/engine-pdfium → PDFium wasm
              │  RGBA pixels, or PNG/JPEG/WebP via OffscreenCanvas
              ▲
      ◄───────┘
      │  Output[] = { name, bytes, mime }
      ▼
  ToolPage.download()              Blob → URL.createObjectURL → <a download>.click()
                                   more than one output → fflate zipSync first
```

**1. Drop.** `Dropzone` takes click, drag and paste and hands back `File[]`.
`ToolPage.select` enforces PRD FR-3: a soft warning over 100 MB, a hard stop over 500 MB
or over 100 MB on a device reporting `navigator.deviceMemory <= 2`. `deviceMemory` is
Chromium-only; absent means "assume it is fine", not "block".

**2. The grid, for the four tools that have one.** `organize`, `remove-pages`,
`extract-pages` and `crop` open the first file once through the worker and build a
`PageRef[]`. Thumbnails come from `use-thumbnails.ts`: **one** open document for the whole
grid, renders capped at four in flight, refcounted per source page, object URLs revoked
when the last cell using a page goes away. A 300-page file therefore transfers its bytes
once, not 300 times. The grid's selection and ordering are mapped back into step options
by `page-selection.ts`. That mapping has its own unit test, because it is the kind of
off-by-one that only shows up in output bytes.

**3. Run.** `ToolPage.run` reads each `File` into a `Uint8Array`, then calls the step
with `{ ...options, ...gridOptions(), engine, encode }` and a context carrying an
`AbortSignal` and an `onProgress` callback. `engine` and `encode` are *injected*: the step
never imports them, which is what keeps `packages/tools` DOM-free and Node-testable.

**4. The step.** One function, `run(inputs, options, ctx) => Promise<Output[]>`
([`packages/tools/src/types.ts`](../packages/tools/src/types.ts)). No DOM, no React, no
globals, no I/O. Structural work (merge, split, rotate, crop boxes, watermark, page
numbers, overlays) is pdf-lib. Anything that needs pixels or text out of a page
(`pdf-to-jpg`, `crop --flatten`, thumbnails) goes through the injected engine, which is
PDFium in a worker.

**5. Download.** One output becomes a `Blob` of its bytes; several are zipped with
fflate's `zipSync` into `fuckpdf-<tool>-<timestamp>.zip`. An object URL, a synthetic
`<a download>` click, and `revokeObjectURL` on the next task, because Firefox aborts the
download if the URL is revoked in the same one. No file has been anywhere but this tab.

## Why the bytes are transferred, not cloned

`postMessage` structured-clones by default. A 200 MB scan handed to a worker that way is
200 MB copied, a second 200 MB live at once, and a visible stall on the main thread. So
every crossing uses `Comlink.transfer` and the `ArrayBuffer` changes owner instead of
being duplicated (PRD NFR-3).

Transfer is destructive (the sender's buffer is detached), so the code copies in exactly
the three places where someone else still needs the bytes, and each copy is commented:

- `workers/engine.ts`, `open()`: `bytes.slice().buffer`, because the tool step still holds
  the `Uint8Array` it is about to run pdf-lib over.
- `use-thumbnails.ts`, `open()`: same buffer as the step's, so the grid copies.
- `pdfium-client.ts`, `ownBuffer()`: transfers when the view owns its whole buffer, copies
  when it is a slice of a larger one, because transferring that would detach bytes the
  caller still needs.

Everything else moves: `open`, `render`, `encode` and the encoded result all transfer.
Thumbnails cross as a `Blob`, which is by-reference anyway.

The worker keeps documents open and addresses them by integer id. That is the reason the
grid is fast: `open` once, then `pageSize`/`render`/`thumbnail`/`extractText` by id, and
`close` when done. `PdfiumDocument.pageSize` is `async` purely so the in-process engine and
the worker-backed one satisfy one contract: a step cannot tell which it got.

## Where the honesty is

AGENTS.md invariant 3 reads "PDF bytes never touch the main thread beyond a transfer".
That is true of **PDFium**: the wasm module is instantiated only inside
`pdfium.worker.ts`, and `pdfium-client.ts` is forbidden from importing anything runtime
out of `@fuckpdf/engine-pdfium` for exactly that reason.

It is **not** yet true of pdf-lib. `module.run` is called directly from `ToolPage`, so a
pdf-lib step parses and writes the document on the main thread. In practice the structural
steps are fast enough that nothing janks, and the tools that do the heavy per-page work
are the ones already in the worker. But it is a gap, not a design: moving the steps behind
a second Comlink worker is the fix, and it is cheap because the step contract is already
pure. Worth doing before Compress or OCR (M3) lands, since those cannot get away with it.

## Lazy engines, and the thing that enforces it

A shell that loads PDFium has already lost: the binary is 4.6 MB and most
visitors touch one tool. Three mechanisms keep it out, in order of who catches what:

1. **`packages/tools/src/registry.ts`** maps each `ToolId` to a bare dynamic import. Every
   entry must stay a side-effect-free `() => import('./<tool>')`; that map is the only
   reason a tool's code, and with it its engine, is not in the entry chunk.
   `packages/tools/src/index.ts` re-exports option *types* only, so the options panel can
   be typed without pulling in the step.
2. **`apps/web/vite.config.ts`** splits `@embedpdf/pdfium` and `pdf-lib` into named
   `engine-pdfium` and `engine-pdflib` chunks, so a stray static import shows up as a
   named chunk in the entry HTML rather than dissolving invisibly into the shell.
3. **`scripts/check-bundle-budget.mjs`** (`pnpm budget`) reads the built `index.html`,
   pulls out every `/assets/*.js` it loads, and fails if any of them is >= 200 KB gzip
   (override with `SHELL_BUDGET_BYTES`) or if an entry chunk is named for, or textually
   contains, an engine. It also fails when `index.html` loads no JS at all, so a broken
   build cannot pass by loading nothing.

The routes are lazy for the same reason:
`TOOL_IDS.map(id => ({ path: id, lazy: () => import('./tool/ToolPage') }))` in
`router.tsx`. Routes are literal slugs, not `/:id`, which is why `ToolPage` resolves its
tool from `useLocation().pathname` rather than from `useParams`. (It used `useParams('id')`
once; every tool page silently rendered the landing instead.)

The wasm binary itself is a content-hashed asset from our own origin:
`engine-pdfium/src/wasm.ts` imports `@embedpdf/pdfium/pdfium.wasm?url` and fetches that.
The package's own `DEFAULT_PDFIUM_WASM_URL` points at a CDN and must never be used:
that is a zero-egress violation, not a performance preference.

## The registry as the single source of truth

`TOOL_IDS` is the list. The router builds one route per id; `shell/groups.ts` arranges the
same ids into landing groups; `locales/en.json` carries `tools.<id>.name` and
`.description`; `tool/options-panel.ts` maps each id to its lazily-imported options panel.
An id only enters `TOOL_IDS` when its step exists, so the landing page cannot link to a
route that does not work. Adding a tool is: write the step plus its test, add the id, add
the lazy import, add the options panel, add the strings, add an E2E case.

Each tool module also exports `defaultOptions`, `inputs: { min, max }` and `accept[]`. The
dropzone's `multiple` and MIME filter and the file cap all come from those, so nothing
about the tool is restated in the UI.

## Package boundaries

```
apps/web                 SPA. The only place with a DOM, React, or a Worker.
packages/ui              HeroUI v3 re-exports + Dropzone + ThemeToggle. No PDF logic.
packages/tools           eleven pure steps + registry. Depends on pdf-lib, fflate, and
                         the engine-pdfium *types*. Runs under Node.
packages/engine-pdfium   wasm instantiation, document lifetime, memory release.
                         Runs under Node (in-process) and in the browser (worker).
e2e/                     Playwright.
```

The boundary is not architecture for its own sake: it is what lets the engine adapter and
every tool step run under Node in CI without a DOM. Two packages the PRD listed were
deliberately not created, and the reasoning is in [DECISIONS.md](./DECISIONS.md) (D6
addendum): **`packages/engine-pdflib`** would be a wrapper with one implementation and one
consumer around a library that is already pure JS and Node-testable, so `packages/tools`
imports `pdf-lib` directly. **`packages/engine-qpdf`** waits for M2, when there is
something to put in it.

`packages/engine-pdfium` earns its boundary because the same contract is genuinely
implemented twice (in-process for the Node tests, over Comlink for the browser) and
because wasm heap handling is the kind of code that is worth having in one place. Note
`heap()` is re-read on every use: the `HEAPU8` view is replaced whenever wasm memory
grows, and a cached one silently writes into freed memory.

## What holds it up

| Layer | Test | Catches |
| --- | --- | --- |
| Tool step | `packages/tools/src/*.test.ts`, Node | The bytes a step produces |
| Engine | `packages/engine-pdfium/src/pdfium.test.ts`, Node | wasm lifetime, render, text |
| Grid mapping | `tool/page-selection.test.ts`, `page-grid.test.ts` | Selection → options |
| Whole path | `e2e/tests/tools.spec.ts`, Chromium | Routing, options wiring, the worker, the download |
| Egress | `e2e/tests/zero-egress.spec.ts`, all three browsers | Any cross-origin request |
| Bundle | `scripts/check-bundle-budget.mjs` | An engine in the shell |

The E2E suite deliberately asserts nothing a step test could see. It exists for the gap
between the layers, and it has already earned its keep: it found that every tool card was
nameless to a screen reader, and that the nine page-number anchors had no accessible name.
