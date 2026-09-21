# fuckpdf

PDF tools. No upload. No account. No bullshit.

Everything runs in your browser — WebAssembly and Web Workers. Your files are never sent
anywhere, because there is nowhere to send them: no backend, no analytics, no telemetry, no
third-party requests. Open DevTools and watch the Network tab stay empty.

**Live:** https://fuckpdf.reqhiem.dev

## Develop

```bash
pnpm install
pnpm dev
```

| Command | What |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Production build to `apps/web/dist` |
| `pnpm lint` | Biome |
| `pnpm typecheck` | `tsc --noEmit`, strict |
| `pnpm test` | Vitest (engine adapters + tool steps, Node) |
| `pnpm e2e` | Playwright, including the zero-egress assertion |

## Layout

```
apps/web            SPA
packages/ui         design system
packages/tools      pure tool steps — (inputs, options) => outputs
packages/engine-*   engine adapters (PDFium, pdf-lib, qpdf)
e2e/                Playwright
.context/           PRD, decision log, roadmap
```

Start with `.context/PRD.md` and `AGENTS.md`.

## License

MIT. See `.context/DECISIONS.md` (D1, D5) for why, and what would change it.
