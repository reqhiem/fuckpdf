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

## Orca run

- Run: `run_edf6ec1191d0`
- Objective: fuckpdf v1 — M0 shell + M1 structural tools
