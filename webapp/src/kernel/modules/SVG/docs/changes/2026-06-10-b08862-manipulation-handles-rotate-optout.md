---
id: 2026-06-10-b08862
name: ManipulationHandles rotate opt-out (for annotations)
description: Add an option to render move+scale handles without the rotate handle, needed by the Composer annotation feature.
status: implemented
modules: [Composer, SVG]
---

## Context

Part of the Composer **annotation nodes** feature (same `id`, see
`webapp/src/system/modules/Composer/docs/changes/2026-06-10-b08862-annotation-nodes.md`).
Annotation label boxes are manipulated via the existing `selectManipulable` /
`ManipulationHandles` flow, but annotations should support **move + scale only — no
rotation**. Today `renderManipulationHandles` always renders the rotate handle.

## Change

In `components/d3/ManipulationHandles.ts`, make the rendered handle set configurable via an
allowlist (additive, backward-compatible — default renders all handles so logos are
unaffected):

- Add an optional `handles?: ("move" | "scale" | "rotate")[]` to `ManipulationHandlesProps`,
  defaulting to `["move", "scale", "rotate"]` when omitted.
- Guard each handle block (move rect, rotate circle, scale rect) so it only renders when its
  name is in `handles`.

Thread `handles` through `SVGEditorToolkit.tsx` → `interfaces.ts` so a caller of
`selectManipulable` can request a specific handle set. The annotation "edit in drawing"
action passes `["move", "scale"]`; logo placements omit it and keep the full set.

No change to transform math, parse/build helpers, or the move/scale handles themselves.

## Status notes

Implemented. The `ManipulateHandle = "move" | "rotate" | "scale"` type and optional `handles?`
prop are threaded through `interfaces.ts` → `SVGEditorToolkit.tsx` → `ManipulationHandles.ts`,
where each handle block is guarded by `showHandle(...)` (undefined → full set). The annotation
"edit in drawing" action ([AnnotationItem.tsx](../../../../../system/modules/Composer/components/viewports/AnnotationListAccordion/AnnotationItem.tsx))
passes `["move", "scale"]`; logo placements omit the prop and keep all three handles.
Chosen an explicit `handles` allowlist over a `disableRotate` boolean for future subsets.

## Security

None. Pure UI-chrome change; no new inputs, IPC, or data flow.

## Performance

None. Renders one fewer handle when disabled; no hot-path or bundle impact.
