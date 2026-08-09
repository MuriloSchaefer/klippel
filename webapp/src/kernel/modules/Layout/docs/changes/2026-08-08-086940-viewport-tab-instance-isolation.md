---
id: 2026-08-08-086940
name: Viewport tabs are independent component instances
description: Key each viewport by name and render the SVG editor onto a copy, so one tab's rendering can never leak into another's.
status: implemented
modules: [Layout, SVG, Composer]
---

## Context

User-reported bug: with two tabs open on the same model, the tab showing the
untouched artwork inherited the *other* tab's colours as soon as you visited
that tab and came back.

Two independent defects combined to produce it, and either alone would have been
enough:

1. **`ViewportLoader` created the viewport component with no `key`.** Only the
   active viewport renders, so switching between two tabs of the *same type*
   swapped one element for another of the same type in the same position —
   which React reconciles as a prop update on one fiber, not as an
   unmount/mount. Every piece of component-local state therefore carried across
   the switch: `useMemo` caches, refs, d3 zoom behaviours.

2. **`renderPreview` painted onto the long-lived parsed document.** Proxies,
   highlights and injections are a presentation layer written on top of the
   artwork as attributes. Applying them in place made every pass depend on the
   ones before it — a proxy that was removed left its colour behind, since
   nothing put back what the source said.

The two met in `useSVGEditor`'s memo. It caches the parsed document on the
content *string*, and two variations of one model hold **equal** strings, so the
memo never recomputed and tab 2 was handed tab 1's already-mutated DOM.

## Change

**Layout — `components/ViewportManager/ViewportLoader.tsx`**

`React.createElement(comp, { ...viewportState, key: viewportState.name })`. Each
tab is now its own component instance, keyed by viewport name.

The cost is a real unmount/remount per tab switch: the incoming tab re-parses
its document and re-seeds its zoom from persisted state. That is the price of
tabs being independent, and it is what a tab already means to the user. It also
means **no component-local state may be relied upon to survive a tab switch** —
anything that must persist belongs in the store or in `.session/`.

See the sibling docs in `kernel/modules/SVG` and `system/modules/Composer` for
the rest of the change.

## Status notes

`implemented`. Guarded by
[`Composer/tests/standalone/integrity/svgTabIsolation.e2e.test.ts`](../../../../../system/modules/Composer/tests/standalone/integrity/svgTabIsolation.e2e.test.ts),
three angles weakest to strongest: one tab proxied and the other not; a
*different* visualization in each tab (so switching must swap red for blue —
"both tabs blank" cannot pass); and a proxy removed inside one tab.

`e2e-tests.md` §9 previously read "cross-tab behavior — untestable". That was
about *browser* tabs; it has been rewritten to say so, and to point at this
test as the example of in-app viewport tabs being perfectly testable.

## Security

None. No new input path, no change to what is parsed or persisted.

## Performance

A tab switch now unmounts and remounts the viewport rather than updating props
on a retained fiber: the incoming tab re-parses its SVG document and re-seeds
its zoom transform. Measured against tab-switch latency on the sample model this
is not perceptible, and it is bounded by document size rather than by tab count.

If it ever does bite, the fix is to memoise the parse in a store-level cache
keyed by *variation id* — not to drop the key, which would reintroduce the leak.
