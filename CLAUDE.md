# AGENTS.md

Read `.context/PRD.md` before writing code. It is the spec. `.context/DECISIONS.md` records
what has already been settled — do not relitigate it.

## What this is

`fuckpdf` — a browser-only PDF toolkit. Every operation runs in the user's browser via
WebAssembly and Web Workers. There is no backend. Nothing is uploaded, logged, or measured.
Static SPA on Cloudflare Workers (assets only, no Worker script).

## Hard invariants

These are not preferences. Breaking one is a bug.

1. **Zero egress.** No `fetch` to any origin but `self`. No analytics, telemetry, beacons,
   error reporting, CDN fonts, or third-party scripts. CSP is `connect-src 'self'`.
2. **No server.** No API routes, no Worker script, no build step that phones home.
3. **PDF bytes never touch the main thread** beyond a transfer. Engines run in Web Workers.
4. **PDFium is the only renderer.** MuPDF is not used (AGPL, redundant).
5. **Every tool is a pure step:** `run(inputs: PdfInput[], options): Promise<Output[]>`.
   No DOM, no React, no globals inside `packages/tools` or `packages/engine-*`.
6. **Engines are lazy.** Never imported by the shell bundle. Loaded per tool on first use.

## Layout

```
apps/web            SPA: routes, shell, tool pages
packages/ui         design system (tokens, primitives). No PDF logic.
packages/tools      pure tool steps. Node-testable, no DOM.
packages/engine-*   one adapter per engine (pdfium, pdflib, qpdf). Node-testable.
e2e/                Playwright
.context/           PRD, decisions, roadmap — project management, not code
```

## Stack (do not substitute)

TypeScript strict · Vite 7 · React 19 · React Router (data router, lazy routes) ·
Tailwind CSS v4 (`@theme`, no `tailwind.config.js`) · lucide-react · Zustand ·
i18next + react-i18next · dnd-kit · fflate · Comlink · Vitest · Playwright · Biome · pnpm.

## Conventions

- Tailwind v4: tokens live in `@theme` in CSS. There is no `tailwind.config.js`.
- Dark mode: `.dark` class on `<html>` via `@custom-variant dark (&:where(.dark, .dark *))`.
- All user-facing strings go in i18n catalogs (`en` only ships). Never hard-code copy in a
  component — the profanity is content, and content is translatable.
- File sizes, page counts and any number render in the mono font.
- Errors: human sentence + copyable technical detail. Nothing is reported anywhere.
- Destructive confirmations (redact, delete pages) are written plainly. No jokes there.
- Never name the product being parodied in code, copy, or markup.

## Checks

Run before claiming done:

```
pnpm lint        # biome
pnpm typecheck   # tsc --noEmit, strict
pnpm test        # vitest
pnpm build
pnpm e2e         # playwright, includes the zero-egress assertion
```

Non-trivial logic leaves one runnable check behind — the smallest thing that fails if the
logic breaks. No fixture frameworks, no per-function suites.

## Ownership when working as a dispatched agent

Edit only the packages your task names. Root config files (`package.json`,
`pnpm-workspace.yaml`, `biome.json`, `tsconfig.base.json`, `wrangler.jsonc`) belong to the
coordinator. Do not run `pnpm install`; ask for a dependency instead of adding one.
