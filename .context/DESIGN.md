# DESIGN.md — fuckpdf

The visual system. Strategy is in [PRODUCT.md](./PRODUCT.md). This file is binding on
anyone writing UI: if a change contradicts it, change this file first.

## Direction: the drafting table

A PDF is a piece of paper stock that someone is about to measure and cut. The interface is
the table it sits on — a drafting surface with a measuring grid, hairline rules, and one
marking colour that says *here is where the cut goes*.

This is deliberately not the two reflexes for the category:

- not the friendly consumer converter (illustrated cards, primary blue, rounded
  everything),
- not the hacker terminal (neon on black, mono body text, scanlines).

It is an instrument. Precise, quiet, and confident enough not to decorate.

**What that means concretely.** The 56px grid is a measuring surface, not a texture — it
appears where the user is positioning something, and fades at the edges rather than
stopping at a hard band. Rules are hairlines at low alpha. Orange is a marking pencil: it
marks the primary action, the current selection, and the active anchor, and nothing else.
White is reserved for actual page stock (thumbnails, page previews) so paper reads as
paper. Numbers are measurements, so they are mono and tabular.

## Component library

**HeroUI v3** (Tailwind CSS v4 + React Aria Components). Not v2 — no provider, no
framer-motion, compound components (`Card.Header`), `onPress` not `onClick`,
`isDisabled` not `disabled`.

`packages/ui` is the only seam. It re-exports the HeroUI primitives the app may use and
adds the two things HeroUI has no equivalent for: `Dropzone` and `ThemeToggle`. **App code
imports from `@fuckpdf/ui`, never from `@heroui/react` directly** — that keeps one list of
what is in the system.

Brand styling is applied by remapping HeroUI's semantic CSS variables in
`apps/web/src/styles/tokens.css`. **Never declare a `--color-*` name in `@theme` that
HeroUI already maps.** HeroUI ships `@theme inline { --color-surface: var(--surface);
--color-muted: var(--muted); --color-accent: var(--accent); --color-danger: var(--danger);
... }`, Tailwind merges `@theme` last-wins, and redefining one of those pins it to a single
literal for both themes. Roughly thirty HeroUI stylesheets compile `bg-surface` or
`text-muted`, so the whole component set renders the wrong colour in one theme. Brand
constants live on `:root` as `--brand-*` instead. Note also that `@theme inline` does not
emit the custom property, so `var(--color-accent)` is undefined in our own rules.

No component overrides HeroUI's own classes, and there is no `tailwind.config.js`
(Tailwind v4 puts tokens in `@theme`).

## Colour

OKLCH throughout. The palette was already committed and shipped; it is preserved.

| Token | Value | Role |
| --- | --- | --- |
| `--color-ink` | `oklch(0.1665 0.0124 254.17)` | Dark-mode ground, light-mode text |
| `--color-paper` | `oklch(0.9673 0.006 40)` | Light-mode ground |
| `--brand-accent` | `oklch(0.6839 0.2069 33.86)` | The marking pencil |
| `--brand-muted-light` | `oklch(0.5 0.015 255)` | Secondary text, **light mode only** |
| `--brand-muted-dark` | `oklch(0.7034 0.0135 255.53)` | Secondary text, dark mode only |
| `--brand-danger` | `oklch(0.6256 0.1933 23.03)` | Destructive, errors |
| `--brand-ok` | `oklch(0.7624 0.1544 159.36)` | Success |

Only the first two are Tailwind theme colours (`text-ink`, `bg-paper`). The `--brand-*`
values feed HeroUI's `--accent`, `--muted`, `--danger` and `--success`, so the utilities you
actually write are HeroUI's: `text-accent`, `text-muted`, `text-danger`, `bg-surface`. Those
switch by theme on their own.

Strategy: **Restrained.** Accent covers well under 10% of any screen. The two radial
washes on `body` are the only decorative colour, and they are nearly transparent.

Light mode uses a different muted than dark mode on purpose: the shipped grey
(`oklch(0.7034 …)`) is only 2.3:1 on paper and failed AA for body text. `text-muted` picks
the right one for the current theme, so never hard-code either value.

## Typography

One family for UI, one for measurements.

- **Space Grotesk** — everything. Headings, labels, body, buttons.
- **JetBrains Mono** — numbers only: file sizes, page counts, dimensions, percentages.
  Use `.measure` (mono + `tabular-nums`) so digits do not jitter as they tick.

Fixed rem scale, not fluid clamps — this is product UI viewed at a consistent DPI, and the
landing hero is the single exception. Display headings: letter-spacing floor `-0.04em`,
size ceiling ~6rem. Prose capped at 65–75ch.

## Layout

- Content column `max-w-6xl`, 24px gutters.
- Responsive grids: `repeat(auto-fit, minmax(280px, 1fr))` rather than breakpoint columns. The
  one sanctioned exception is the landing tool grid, where cards have deliberately varying
  spans to give the eleven tools a hierarchy; varying spans need a known column count, so it
  uses `sm:grid-cols-2 lg:grid-cols-6`. Group sizes are chosen so every row fills exactly.
- Radius is two tiers, which is HeroUI's own system and is applied consistently by it:
  **surfaces** (cards, panels, popovers, the drafting well) use `--radius` at 0.75rem, and
  **interactive controls** (buttons, chips, toggles) use `rounded-3xl`, which reads as a
  pill at control heights. Fields inherit `--field-radius`. Do not flatten the control tier
  by overriding `--radius-3xl`: sixteen HeroUI stylesheets share that name, so the override
  would also square off modals, tabs, avatars, badges and the calendar. Two documented tiers
  is a system; a third ad-hoc value is not. The only sanctioned exception is the
  page-numbers anchor grid, where each button is a miniature page and needs real corners.
- Z-index is a named scale (`--z-sticky` 20, `--z-backdrop` 40, `--z-modal` 50,
  `--z-toast` 60). Never an arbitrary `9999`.
- **Nothing sticky may overlap a form field.** A sticky action bar gets its own row in the
  grid and its own background; it does not float over inputs. (This shipped broken once —
  the Run button sat on top of the font-size field.)

## Motion

150–250ms, `--ease-reveal` (`cubic-bezier(0.16, 1, 0.3, 1)`), exponential ease-out. No
bounce, no elastic, no page-load choreography — users arrive in a task.

Motion conveys state only: a file landing, a page being picked up, progress advancing, a
result arriving. Reveals enhance already-visible content; nothing is gated behind a
transition that a headless render would never fire.

`prefers-reduced-motion: reduce` collapses durations to ~0 globally in `tokens.css`.

## Component states

Every interactive element ships default, hover, focus-visible, active, disabled, and —
where it can be busy — pending. HeroUI provides these; the job is not to break them.

Loading uses `Skeleton` in the shape of the content, not a spinner dropped in the middle
of a panel. Empty states teach the tool: they say what to drop and what will come out.

## Bans

On top of the shared ones (no gradient text, no side-stripe borders, no glassmorphism as
default, no tiny tracked eyebrow above every section):

- No emoji in UI chrome.
- No icon-only control without an accessible name.
- No mono for body copy — it is for measurements.
- No jokes on a destructive confirmation.
- No decorative motion.
