# Orchestration

How this repo is built. Coordination runs on Orca; bulk generation is delegated to
Antigravity (`agy`); judgement-heavy work stays on Claude/Codex workers.

## Roles

| Role | Who | Scope |
|---|---|---|
| Coordinator | Claude Code (Orca coordinator terminal) | Decomposition, dispatch, verification, merge. Owns correctness. |
| Worker (Claude) | Orca `--agent claude` | WASM/engine integration, worker RPC, anything with subtle failure modes. |
| Worker (Codex) | Orca `--agent codex` | UI shell, design system, deploy/CI/E2E wiring. |
| Bulk generator | Antigravity `agy-delegate` | Mass scaffolding, repetitive tool-step files, exhaustive test generation. |

## Rules

1. **The coordinator verifies everything.** No worker's or `agy`'s self-reported
   "green" is accepted. The gate (`pnpm lint && pnpm typecheck && pnpm test`) is re-run by
   the coordinator in a clean state.
2. **Package boundaries are ownership boundaries.** A worker edits only the packages named
   in its task spec. Root files (`package.json`, `pnpm-workspace.yaml`, `biome.json`,
   `tsconfig.base.json`) are coordinator-owned; a worker that needs a change there asks.
3. **No worker runs `pnpm install`.** Dependencies are installed once by the coordinator.
   A worker needing a new dependency asks instead of adding it.
4. **Delegate to `agy` only above break-even** — bulk, repetitive, or long-context work.
   A one-file edit is a net loss to delegate.
5. **Every tool step lands with one runnable check.** Smallest thing that fails if the
   logic breaks. No fixture frameworks.

## Waves

### Wave 1 — v1 (M0 shell + M1 structural tools)

- Orca run: `run_edf6ec1191d0`
- 7 dispatches, all settled and released. M0 and M1 shipped and byte-verified in a real
  browser; CI and Deploy green.

### Wave 2 — HeroUI v3 design system migration

In-session Claude subagents rather than Orca workers: the wave is one repo, one working
tree, and four disjoint file sets, so the coordination Orca buys was not worth its setup.

The contract was frozen before dispatch, exactly as in wave 1 — `packages/ui/src/index.tsx`
(the primitives seam), `apps/web/src/styles/tokens.css` (the HeroUI variable bridge) and
`.context/DESIGN.md` (the binding visual system) were all written by the coordinator first,
so no two agents could disagree about them.

| Agent | Owns | Task |
|---|---|---|
| `panels` | `apps/web/src/tools/**`, `en.options.json` | Eleven option panels onto HeroUI fields |
| `shell` | `apps/web/src/shell/**`, `en.json` | Landing, header, footer, tool cards, static pages |
| `toolpage` | `apps/web/src/tool/ToolPage.tsx`, `components/page-grid/**`, `en.tool.json` | Tool page states, the sticky-overlap bug, page grid |
| `docs` | `README.md`, `CONTRIBUTING.md`, `.context/ROADMAP.md`, `.context/ARCHITECTURE.md` | Repository presentation |

Locale catalogues are split three ways (`en.json`, `en.options.json`, `en.tool.json`,
merged in `i18n.ts`) for the same reason as in wave 1: one JSON file edited by three agents
is a guaranteed conflict, and the split costs one line of merge.

The coordinator kept `e2e/`, root config, and the token bridge. That mattered: HeroUI's
`Select` is a React Aria listbox, so Playwright's `selectOption` stops working on it, and
the four affected tests were fixed on the coordinator's side rather than by letting a
worker edit the suite that grades it.

### Wave 3 — tool page layout, editor workspace, tooltips

Same shape as wave 2: four in-session subagents on disjoint file sets, contract frozen by
the coordinator first (`packages/ui` gained `Hint` and `IconButton`; the two-column tool
page and the editor's "owns its height" rule were written into the prompts).

| Agent | Owns | Task |
|---|---|---|
| `toolpage` | `ToolPage.tsx`, `file-strip/**`, `live-preview/**`, `en.tool.json`, `en.preview.json` | Surface + sticky sidebar, result in the sidebar |
| `editor` | `pdf-editor/**`, `tools/edit`, `en.edit.json` | Viewport-tall workspace, zoom, inspector empty state, HeroUI colour fields |
| `grid` | `page-grid/**`, other `tools/*/options.tsx`, `en.options.json` | Tooltips, paper look, density, options panel audit |
| `shell` | `shell/**`, `en.json` | GitHub link, `max-w-7xl` everywhere |

Lesson: a named Agent launch that reports a tmux/Orca pane error may still have started.
One did, and two writers interleaved edits in the grid's files until the stray process was
killed. After a launch error, check `ps` for `--agent-name` before relaunching.

### Wave 4 — prerendered first paint (D11)

Two in-session agents, which was all the work supported: the seam (`vite.config.ts`,
`prerender.tsx`, `main.tsx`, `router.tsx`, `seo.ts`) is a single coupled change, so the
coordinator kept it, along with `e2e/`.

| Agent | Owns | Task |
|---|---|---|
| `ssr-audit` (read-only) | nothing | Import graph from `router.tsx`: Node crashes at import time, render-time browser reads, CSS imported from JS, the router's static APIs |
| `theme-boot` | `index.html`, `_headers`, `theme-boot.test.ts` | Theme applied before paint by an inline script, allowed through its CSP hash |

Lesson: `vite preview` sent no CSP, so e2e could never catch a CSP bug. The `data:` fonts
Vite inlines had been blocked in production all along. The router's hydration script and
React's `$RC` reveal script would have shipped the same way. Preview now serves the
`_headers` CSP.
