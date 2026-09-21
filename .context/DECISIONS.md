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
| D6 | Monorepo layout per PRD §7 | **Accepted as specified** | 2026-09-21 |

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
