# Contributing

Read [`AGENTS.md`](AGENTS.md) first. It is short, and it is the contract. This file only
covers what it does not: how to get a change through.

Before writing code, read [`.context/PRD.md`](.context/PRD.md), which is the spec, and
[`.context/DECISIONS.md`](.context/DECISIONS.md), which records what is already settled.
Reopening a settled decision needs a new fact, not a new opinion.

## The invariants

Six of them, in [`AGENTS.md`](AGENTS.md#hard-invariants). They are not style preferences:
breaking one is a bug, and most of them have something in CI that notices.

| Invariant | What catches you |
| --- | --- |
| Zero egress: no request to any origin but `self` | `e2e/tests/zero-egress.spec.ts`, and the CSP in `apps/web/public/_headers` |
| No server, no Worker script | `wrangler.jsonc` having no `main`; a PR that adds one is a different project |
| PDF bytes never touch the main thread beyond a transfer | review, plus the shape of `apps/web/src/workers/pdfium-client.ts` |
| PDFium is the only renderer | review |
| Every tool is a pure step, no DOM, no globals | `packages/tools` unit tests run under Node |
| Engines are lazy, never in the shell bundle | `pnpm budget` |

Two more, from the conventions section rather than the invariants, that are easy to break
by accident: **all user-facing copy lives in the i18n catalogs**, never inline in a
component; and **the parodied product is never named** in code, copy, markup, commit
messages or comments.

Design changes answer to [`.context/DESIGN.md`](.context/DESIGN.md), which is binding: if
a change contradicts it, change that file in the same PR and say why.

## Package ownership

When work is split across several people or agents at once, **edit only the packages your
task names**. The root configuration (`package.json`, `pnpm-workspace.yaml`,
`biome.json`, `tsconfig.base.json`, `wrangler.jsonc`) belongs to whoever is coordinating.

Do not run `pnpm install` to add a dependency; ask for it. A new dependency is a decision
about bundle size, licence and supply chain, not a convenience. The full rules are in
[`.context/ORCHESTRATION.md`](.context/ORCHESTRATION.md).

## The gate

Everything below must pass on a clean checkout before a change is done. CI
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs exactly this, in this order.

```bash
pnpm lint        # biome
pnpm typecheck   # tsc -b --noEmit, strict
pnpm test        # vitest
pnpm build
pnpm budget      # shell JS < 200 KB gzip, no engine chunk in the shell
pnpm e2e         # playwright, includes the zero-egress assertion
```

`pnpm format` applies the fixes Biome can apply on its own. Note that Biome checks
JavaScript, TypeScript, JSON and CSS. Markdown is not linted, so prose formatting is on
you.

Non-trivial logic leaves **one** runnable check behind: the smallest thing that fails if
the logic breaks. Not a suite per function, no fixture framework. A tool step's test
asserts the bytes it produces; an E2E test asserts what the browser actually downloaded.
If the same behaviour is already covered a layer down, do not cover it again.

## Commit style

Read `git log`. The pattern, in short:

- Subject in the imperative, sentence case, no `type:` prefix, no ticket number, no emoji.
  It says what the commit does in plain words: *"Bind the E2E preview server explicitly so
  CI can reach it"*, not *"fix(e2e): config"*.
- A body whenever the *why* is not obvious from the subject, wrapped at ~80 columns,
  explaining the cause rather than restating the diff. Root causes are worth a paragraph:
  *"The webServer command passed `--` before its flags, which makes vite ignore `--host`
  and `--port` entirely."*
- A commit that fixes a real defect found along the way says so and says what the defect
  was. Several related fixes in one commit is fine; the body lists them.
- Present tense for what the code now does. No "should", no "hopefully".

## Reporting something broken

Bugs live in the repo's issues. A useful report is: what you dropped in, which tool, which
browser and version, what came out, and what you expected. Attach the PDF only if you are
happy for it to be public. Given what this project is for, you probably are not, so a
minimal file that reproduces the problem is better than the real one.

Nothing is reported automatically. There is no error tracker, so if you do not tell
someone, nobody knows.
