---
id: 2026-06-10-b08862
name: Annotation nodes in the composition
description: Add garment annotations (plain-text notes pinned to the drawing with a target point + leader line, move/scale, elective gating).
status: implemented
modules: [Composer, SVG]
---

## Context

Garments need free-form **annotations** — text notes pinned to the drawing. Each annotation
has:

- A **plain-text body** shown as a label in the drawing.
- A **target point** anchored in the drawing, with a **leader line** from the target to the
  label.
- **Move + scale** handles on the label (no rotation), plus a draggable target point.
- An optional **elective link** — the annotation only renders when its elective is enabled.

The annotation must be **exportable** — i.e. part of the editor SVG so it survives SVG
serialization/rasterization. That rules out an HTML `<foreignObject>` + markdown approach
(foreignObject is commonly dropped on export). Plain text renders natively as SVG
`<text>`/`<tspan>`, so annotations are **injected into the editor SVG user-space** the same
way logo placements are (via the injected-element/proxy mechanism in `useVariationActions`).
Being real children of `#svg-editor`, they zoom/pan with the art and are included in exports
for free — **no visual React overlay, no zoom-transform sync needed.** (A *headless*
overlay that renders nothing — `AnnotationOverlay.tsx` — still reconciles elective-gated
visibility and owns the target-point drag; see the Viewport section.)

> Scope note: starting with **plain text only**. A richer body (markdown/preview) was
> considered and dropped for now because of the export requirement; can revisit later with
> an export-safe rendering path.

The feature otherwise mirrors the existing **Logo** feature end-to-end (store → actions → UI
→ SVG render → elective gating → MCP tools → shortcuts → e2e), with two differences: it adds
a target point + leader line, and it is **purely informational** (no cost / no computation
middleware).

Authoring lives **inside Garment Details** (a new accordion in `GarmentDetails.tsx`),
alongside Visualizations and Processes.

## Change

### Data model — `typings.ts`

Add `AnnotationNode` after the Logo block:

```ts
export type AnnotationNode = Node & {
  type: "ANNOTATION";
  label: string;                 // short title shown in the accordion row
  annotationId: string;          // small hash
  text: string;                  // plain-text body; rendered as SVG <text>/<tspan>
  target: { x: number; y: number };               // leader origin, SVG user-space
  transform: { x: number; y: number; scale: number }; // label position + scale (no rotation)
  electiveNodeId?: string;       // optional elective gate (same field/pattern as LogoNode)
};
```

Add edge types `HasAnnotationEdge` / `AnnotationOfEdge` (`"HAS_ANNOTATION"` /
`"ANNOTATION_OF"`) mirroring `HasLogoEdge` / `LogoOfEdge`; annotation connects to the
garment node like logos use `HAS_LOGO`. No cost fields, no audit type, **no
computation-middleware loop** (skip the `store/computation/middlewares.ts` changes logos
required).

### Actions — `hooks/useVariationActions.ts`

Mirror the logo action group. These dispatch Graph node/edge actions **and** maintain the
injected SVG markup/proxy (same injected-element/proxy helpers logos use — `addInjectedElementAction`,
`addProxyAction`, `updateProxyAction`, `deleteInjectedElementAction`, `deleteProxyAction`):

- `addAnnotation({ garmentId, label?, text? })` → creates node + edges; injects a
  `<g id="annotation-{annotationId}">` containing the leader `<line>`, target `<circle>`,
  and label `<text>`; returns node id.
- `updateAnnotationText(nodeId, text)` — rewrite the `<text>`/`<tspan>` content
  (XML-escaped; split on `\n` into tspans).
- `renameAnnotation(nodeId, label)` — accordion title only, no SVG change.
- `updateAnnotationTransform(nodeId, transform)` — label move/scale; update the `<text>`
  transform proxy **and** recompute the leader `<line>` (label end).
- `updateAnnotationTarget(nodeId, target)` — move target `<circle>` **and** recompute the
  leader `<line>` (target end).
- `linkAnnotationElective(nodeId, electiveNodeId)` — mirror `linkLogoElective`; toggles the
  injected group's visibility based on the elective value.
- `removeAnnotation(nodeId)` — delete node, edges, and all injected elements.

Injected-id helpers (mirror the `logo-*` id helpers): `annotation-{annotationId}` (group),
`annotation-text-{annotationId}`, `annotation-line-{annotationId}`,
`annotation-target-{annotationId}`.

### Viewport rendering & interaction

No new render component — the annotation is injected SVG content inside `#svg-editor`, so it
renders/zooms/pans/exports as part of the editor (like logo placements). Interaction:

- **Label move/scale:** an "edit in drawing" button in the accordion row calls
  `svgToolkit.selectManipulable(`annotation-text-{annotationId}`, { onTransform })` (see
  `LogoPlacementsButton.tsx:57`), wiring `onTransform` → `updateAnnotationTransform`. Pass a
  `handles: ["move", "scale"]` allowlist (see SVG-module change doc, same id) so no rotate
  handle appears.
- **Target-point drag:** a custom pointer handler on the target `<circle>` (mirroring the
  pointer-drag in `LogoMainCopyOverlay.tsx`, but converting screen deltas to user-space via
  the element CTM as `ManipulationHandles` move does). Live-updates the circle + leader line
  during drag; commits `updateAnnotationTarget` on pointer-up.
- **Leader line:** recomputed from `target` and the label's transform whenever either
  endpoint moves (label end = text bbox center/nearest edge). During a drag, update the
  `<line>` live; on commit, the action persists the recomputed coords.

**Elective gating:** when an annotation's `electiveNodeId` points to an `ElectiveNode` with
`value === false`, the injected group is hidden (`display:none` on the proxy). Annotations
have no cost middleware to ride along with (unlike logos), so this is reconciled by a small
**headless overlay** — `AnnotationOverlay.tsx` (renders `null`) — that subscribes to the
annotation→elective links plus elective values and dispatches `setAnnotationHidden` only on
change. The same component also owns the target-point drag (see below).

### Authoring UI — `AnnotationListAccordion/` (new) + `GarmentDetails.tsx`

New `AnnotationListAccordion/` under `components/viewports/`, structured like
`LogoListAccordion/`:

- `index.tsx` — list of `AnnotationItem`s + `AddAnnotationButton`.
- `AddAnnotationButton.tsx` — id `composer-add-annotation`, `data-testid="add-annotation"`,
  wrapped in `<ShortcutHint shortcutId={`${MODULE_NAME}/AnnotationList/addAnnotation`}>`.
- `AnnotationItem.tsx` — row (`data-testid="annotation-item"`,
  `data-annotation-label={label}`, `id={node.id}`) with: title `TextField` (rename), a
  multiline plain-text `TextField` for the body (→ `updateAnnotationText`), an "edit in
  drawing" button (`selectManipulable`), a link-elective control (mirror
  `LogoLinkElectiveButton`), and a delete button.

Wire into `GarmentDetails.tsx` as a new `<FocusShortcutProvider
contextId={ANNOTATION_LIST_CONTEXT_ID}>` + `<Accordion>` next to Visualization/Process.

Add to `constants.ts`:
`export const ANNOTATION_LIST_CONTEXT_ID = `${MODULE_NAME}/AnnotationList`;`

### Keyboard shortcuts (+ hints) — `kernelCalls.ts`

Register, scoped to `ANNOTATION_LIST_CONTEXT_ID` (mirror logo bindings): `addAnnotation`
(`a`, clicks `#composer-add-annotation`), focused-row actions `delete` (`d`), `linkElective`
(`w`), `editInDrawing` (`m`), and row navigation `focusNext`/`focusPrev` (`ArrowDown`/`ArrowUp`).
A `focus` binding (`Ctrl+Alt+a`, scoped to `ModelViewport`) toggles/focuses the accordion.
Per CLAUDE.md the actionable shortcuts get a visible `ShortcutHint` on their control (add
button + per-row icon buttons via `alwaysShow={isFocused}`; the `focus` binding via the
Accordion `shortcutHint` prop). Arrow-key row navigation follows the existing list-nav
pattern (no per-key hint).

### MCP tools — `mcpTools/` (+ `index.ts`)

Click + `Shortcut` variant pairs, registered in the `TOOLS` array, orchestrating puppeteer
drivers (mirror logo tool pairs): `addAnnotation`, `editAnnotation` (set text/label),
`linkAnnotationElective`, `deleteAnnotation`. Run the **reconnect** skill after adding.

### Drivers + e2e — `AnnotationListAccordion/drivers/` + `tests/standalone/functionality/`

Drivers (`.click` / `.shortcut` puppeteer): open accordion, add, rename, set text, link
elective, delete, plus `AnnotationManipulation.click.puppeteer.ts` for label drag/scale and
target-point drag. e2e tests assert the **actual editor render** (wait for
`#annotation-text-…` / leader `#annotation-line-…` / target `#annotation-target-…` under
`#svg-editor`, assert the rendered text content, assert elective toggle hides/shows the
group) — not just node state. Follow the **e2e-test-rules** / **performance-tests** skills;
no inline `page.evaluate` callbacks in MCP tool files.

## Status notes

Implemented. Resolutions of the original open decisions:

- **Elective-toggle visibility** is reconciled by a dedicated headless `AnnotationOverlay.tsx`
  (subscribes to links + elective values, dispatches `setAnnotationHidden` on change) — not the
  graph-change flow, since annotations have no cost middleware to ride along with.
- **Target-point drag** is delegated through the same overlay (screen→user-space via the
  circle parent CTM), live-updating the circle + leader line and committing on pointer-up.
- **Multi-line handling**: body is split on `\n` into one `<tspan>` per line; text is
  XML-escaped (`escapeXml`) before injection (see Security).

## Security

Low. Annotation text is **plain text injected into the editor SVG markup**, so it MUST be
**XML-escaped** when building the `<text>`/`<tspan>` content (escape `& < > "` / newlines)
to prevent breaking the SVG or injecting markup into the document (and into exported SVG
files). No raw-HTML rendering, no react-markdown, no new IPC/secrets/permissions. Annotation
data is local graph state persisted with the model like other nodes.

## Performance

Low impact, lighter than the dropped markdown/foreignObject approach. Annotations are native
SVG (`text` + `line` + `circle`) injected once into the editor SVG; they zoom/pan as part of
the editor with **no per-frame React re-render and no zoom-transform mirroring**. Updates are
localized proxy edits (text content, transform, line endpoints). Hidden (elective-off)
annotations render nothing (`display:none`). No computation-middleware cost loop is added.

## Key files

- Types: `webapp/src/system/modules/Composer/typings.ts`
- Actions (+ injected-element/proxy helpers): `webapp/src/system/modules/Composer/hooks/useVariationActions.ts`
- Manipulation handles allowlist: `webapp/src/kernel/modules/SVG/components/d3/ManipulationHandles.ts` (see SVG change doc, same id)
- UI: new `AnnotationListAccordion/` + `webapp/src/system/modules/Composer/components/viewports/ModelViewport/DetailPanel/GarmentDetails.tsx`
- Shortcuts/constants: `webapp/src/system/modules/Composer/kernelCalls.ts`, `webapp/src/system/modules/Composer/constants.ts`
- MCP: `webapp/src/system/modules/Composer/mcpTools/` (+ `index.ts`)
