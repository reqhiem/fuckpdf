# PRODUCT.md — fuckpdf

Strategic context for design work. The functional spec is [PRD.md](./PRD.md); settled
questions are in [DECISIONS.md](./DECISIONS.md). This file answers who, what and why.

## Register

**Product**, with one brand surface.

The eleven tool pages are a product register: the user is mid-task and the design serves
the task. The landing page is the one brand surface — it has to land the claim ("nothing
is uploaded") in about four seconds, because that claim is the entire reason to switch.

Anything under `/` is brand. Anything under `/<tool>` is product. When the two registers
disagree, the tool page wins: people come back for the tool, not for the hero.

## Users & purpose

Someone who has just been told by another PDF site that they must sign up, wait in a
queue, or pay, to do something a computer can do instantly. They are annoyed, they are
mid-task, and the file they are holding is often one they should not be uploading to a
stranger — a contract, a payslip, a medical scan, an ID.

The job: merge/split/rotate/number/crop this file, in under a minute, without it leaving
the machine, and without learning anything.

Two things follow from that:

1. **Time-to-first-output is the metric.** Not sessions, not returns. Land, drop, run,
   download, leave. Nothing may sit between the drop target and the result.
2. **The privacy claim has to be visible, not stated.** "We don't upload your files" is
   what every upload site also says. The interface has to make it checkable — name the
   mechanism, invite the devtools Network tab, and work offline.

## Brand personality

**Blunt · precise · unimpressed.**

The profanity is the voice of someone competent who is tired of being handled. It is not
edginess for its own sake, and it never lands on a destructive action: delete, redact and
overwrite confirmations are written plainly and seriously. Jokes go in the marketing copy
and the tool taglines, never in the place where a user could lose a file.

## Anti-references

- **The category incumbent.** Never named in code, copy or markup (see AGENTS.md). Its
  look — friendly primary-red, rounded illustrated cards, a queue, a paywall at page 3 —
  is the thing being satirised, so it is also the thing to avoid resembling.
- **Hacker-terminal dark mode.** Neon-on-black, mono everywhere, scanlines, "root@". It is
  the obvious second move after rejecting friendly-blue, which makes it just as generic.
- **Privacy-theatre minimalism.** A lock icon, a shield, a beige wall of reassurance. The
  proof is the network tab, not an illustration.

## Accessibility

Non-negotiable, and treated as correctness rather than polish:

- WCAG 2.2 AA. Body text ≥ 4.5:1, large text ≥ 3:1, placeholders held to body contrast.
- Every interactive element reachable and operable by keyboard, with a visible focus ring.
  The page grid's reordering has a documented keyboard path, not just drag.
- `prefers-reduced-motion` honoured everywhere.
- No control conveys its state by colour alone.

The e2e suite asserts accessible names, not just clicks, because a nameless control has
already shipped here once.

## Strategic design principles

1. **The file is the interface.** Once a file is dropped, the pages of that file are the
   main object on screen. Controls arrange themselves around it.
2. **Never block on a decision the default can make.** Every tool runs with zero options
   touched. Options refine a result; they do not gate one.
3. **Show the mechanism.** Where a competitor shows a spinner and a promise, show the
   thing actually happening locally: page counts, byte sizes, the worker starting.
4. **Silence is a feature.** No onboarding, no tour, no cookie banner, no toast thanking
   anyone. The product's whole pitch is that it does not talk to anyone about you.
