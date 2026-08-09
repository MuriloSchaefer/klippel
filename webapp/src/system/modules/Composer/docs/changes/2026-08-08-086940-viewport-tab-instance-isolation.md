---
id: 2026-08-08-086940
name: Viewport tabs are independent component instances
description: The Composer half — a data-variation-id mirror on the editor, and the integrity test that pins per-tab SVG rendering.
status: implemented
modules: [Layout, SVG, Composer]
---

## Context

See the Layout and SVG docs of the same id for the bug and the two defects
behind it. This file records what Composer contributes: the mirror that makes
the invariant *assertable*, and the test that asserts it.

The problem for a test is that only the active viewport renders, so every tab's
editor carries the same `#svg-editor` id. A selector that stops at that id
cannot distinguish "this tab renders the source colour" from "some tab does" —
which is precisely the confusion the bug hid behind.

## Change

**`components/viewports/ModelViewport/SVGView/SVGModelViewport.tsx`**

The editor `<svg>` gains `data-variation-id={variationId}`, mirroring which
variation it is rendering. Combined with a `[role="viewport-content"]` scope,
that turns "tab 2 shows the source colour" back into an assertion about one
identified instance rather than about whatever editor happens to be in the DOM.

**`components/viewports/ProcessTimeAccordion/index.tsx`**

Numeric mirrors for the figures the accordion derives, so tests assert numbers
instead of parsing captions: `data-time-minutes-per-unit`, `data-time-garments`
and `data-time-total-minutes` on the accordion, and `data-process-minutes` per
row (empty while the row is `pending`, matching what it shows). The comment on
`totalMinutesPerUnit` records why there is deliberately **no** elective gate in
the sum: `computeProcessTime` already returns no time for a suppressed process,
and re-checking the elective here would duplicate a decision that belongs to the
computation and could silently drift from it.

**`tests/standalone/integrity/svgTabIsolation.e2e.test.ts`** (new)

Three angles, weakest to strongest:

1. One tab proxied, the other not — the reported regression, on the return trip.
2. A *different* visualization in each tab, so switching must swap red for blue.
   A stale render is then a wrong colour rather than a missing one, and "both
   tabs blank" cannot pass.
3. A proxy removed inside one tab — pins the render-onto-a-copy half on its own.

`integrity`, not `functionality`: nothing here asks whether visualizations work
(that is `editVisualization.e2e.test.ts`). It asserts the invariant that one
instance's rendering cannot reach another's, and that the paint is reversible
whatever order the passes ran in.

Two details make the assertions precise. The fixture's `rect-border` ships
`fill="none"`, so both states are exact attribute selectors (`[fill="none"]` vs
`[fill="#ff0000"]`) — a leak is the wrong one of two values, never an ambiguous
absence. And every selector names the variation, per the above.

**`tests/standalone/integrity/costSampleAudits.e2e.test.ts`** (new)

Separate work, recorded here because it consumes the same mirrors: it reads the
seeded variation's id off `data-variation-id` instead of reaching into the
store, and asserts the time accordion through the new numeric mirrors. See the
`Reference` note below.

## Status notes

`implemented`.

`e2e-tests.md` §2 gained the two rules this change produced — name the instance
when an `id` is reused, and assert rendered output when the bug is in rendering
— and §9's "cross-tab is untestable" entry was corrected to say *browser* tabs,
pointing at `svgTabIsolation.e2e.test.ts` as proof that in-app viewport tabs are
testable.

`costSampleAudits.e2e.test.ts` is documented as part of the cost-sample seeder
work; see `webapp/scripts/seed/costSample.seed.ts` and `e2e-tests.md` §13.

One deviation to revisit: `costSampleAudits` parses the material audit panel's
text with regexes (`Consumo por unidade:` / `Total considerando graduações:`)
because that panel has no numeric mirrors. Under §2 it should get
`data-consumption-per-unit` / `data-consumption-total` mirrors and the regexes
should go. Left as a follow-up rather than widening this change.

## Security

None.

## Performance

None from the mirrors themselves — they are string attributes on elements that
already render, computed from values the components already hold. See the Layout
doc for the tab-switch remount cost.
