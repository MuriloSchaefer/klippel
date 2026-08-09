---
id: 2026-08-08-086940
name: SVG rendering is a pure function of state, per instance
description: Render each preview onto a fresh copy of the parsed document and key the parse by instance, so proxies neither accumulate nor leak between viewports.
status: implemented
modules: [Layout, SVG, Composer]
---

## Context

See the Layout doc of the same id for the user-visible bug. The SVG half of it:

- `useSVGEditor`'s `parsedSVG` memo was keyed on `svgState.content` alone. Two
  variations of one model hold **equal** content strings, so under `Object.is`
  the memo handed both instances the same document object — and that document is
  handed out for mutation.
- `renderPreview` mutated that document in place. Injections were cleared and
  re-mounted each pass (idempotent), but proxies and highlights were only ever
  *written*, never undone. Removing a visualization left its colour on the
  element until the content itself changed.

Sharing the parse was only survivable while nothing wrote to it. It wrote to it.

## Change

**`hooks/useSVGEditor.ts`**

- `parsedSVG` deps are now `[svgState?.content, svgPath, instanceName]`. The
  parse is per instance, so sharing can never become load-bearing again. The
  document is kept **pristine** — it is the source, not the canvas.
- `renderPreview` starts from `parsedSVG.cloneNode(true)` and paints injections,
  proxies, highlights and picker listeners onto that copy. Each render is then a
  pure function of state: "what is no longer proxied" needs no bookkeeping to
  undo, because nothing carried over. The manual
  `querySelectorAll(".svg-injected-container").forEach(remove)` prelude is gone
  with the reason for it.
- `cloneNode` is the cheap half of what the function already did — the preview
  subtree is wiped and re-appended on every call regardless, and a native deep
  clone costs far less than the re-parse it replaces.
- Proxy application now bails on a missing element (`if (!elem) return`) instead
  of threading `?.` through the loop, and strips the proxied property from the
  element's inline `style` on the copy only.
- New `renderedSVGRef` holds the document the last render actually mounted.
  `transform` serializes **that**, falling back to the pristine parse before the
  first render, so a tool that writes into the drawing (the element picker
  stamping an id on the node it picked) persists what the user is looking at.

**`hooks/useSVG.ts`**

Same instance-keying on its `parsedSVG` memo (`[state?.content, path,
instanceName]`), for the same reason: `DOMroot` is handed out for mutation.

## Status notes

`implemented`. Covered by
[`Composer/tests/standalone/integrity/svgTabIsolation.e2e.test.ts`](../../../../../system/modules/Composer/tests/standalone/integrity/svgTabIsolation.e2e.test.ts).
Its last `it` — remove a visualization, the source colour comes back — pins the
render-onto-a-copy half on its own, independently of the tab keying.

**Known limitation, unchanged by this work.** `transform` serializes the
rendered copy, which carries the full presentation layer: injected containers,
proxy attributes, the picker's hatch highlight. So a `transform` bakes the
current paint into the stored content. This was equally true before (the old
`transform` serialized `parsedSVG`, which the passes had mutated in place), and
the element picker is the only caller. It is called out in the `transform`
docstring because a **second** caller must not be added without first stripping
the presentation layer off the copy.

## Security

None. Same parse path, same sanitization, same serializer.

## Performance

`renderPreview` gains one `cloneNode(true)` per render and loses the injection
clear-out loop. Native deep clone on a garment SVG is well under the cost of the
DOM writes the same function already does, and far under the re-parse it stands
in for.

The instance-keyed memo means two tabs on the same artwork now hold two parsed
documents instead of one. That is the correctness requirement, not a regression
to recover: they were never safely shareable.

If parse cost ever shows up on tab switching (it now happens on every switch —
see the Layout doc), cache the parse in the store keyed by *variation id*, never
by content.
