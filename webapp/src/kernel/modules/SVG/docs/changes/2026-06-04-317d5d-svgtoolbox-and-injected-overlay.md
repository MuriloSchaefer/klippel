---
id: 2026-06-04-317d5d
name: svgtoolbox + injected-element overlay
description: Extend the SVG editor toolkit with a manipulation toolbox (copy/rotate/scale/drag/clip) and generalize the proxy model to carry transforms and inject new elements (symbols, images, clipPaths) non-destructively.
status: draft
modules: [Composer, SVG]
---

## Context

The Composer "Logos" feature (see the sibling [Composer change doc](../../../../../system/modules/Composer/docs/changes/2026-06-04-317d5d-logos-embroidery-silkscreen.md), same id) needs the SVG editor to (1) render **new** elements that don't exist in the source SVG — logo symbols/images, transformed placement instances, and clipPaths — without mutating the saved document, and (2) let the user **copy / rotate / scale / drag / clip** those placements directly in the draw view.

Today the SVG kernel offers two overlay capabilities, both in the [EditorToolkit](../../components/SVGEditorToolkit.tsx) context and applied in [useSVGEditor.renderPreview](../../hooks/useSVGEditor.ts#L119-L244):

- **Proxies** — per-element-id attribute/style overrides (`Proxies = { [id]: CSSProperties }`, [state.ts](../../store/state.ts#L5-L7)), applied onto **existing** elements (useSVGEditor.ts:136-147).
- **pickElement** — an interactive "click an element in the SVG" picker with hover highlighting (useSVGEditor.ts:160-242), used by Composer's visualization binding.

Neither can inject new geometry, and the toolkit has no concept of manipulating an element's transform or clip. This change adds both, in the SVG kernel so any editor host benefits, and keeps everything **non-destructive** (the source document is never rewritten — the overlay layers on at render time and persists with the instance session).

## Change

### 1. Generalize the proxy model to transforms + injected elements — [store/state.ts](../../store/state.ts)

Proxy values gain transform/clip fields (still keyed by element id):

```ts
export type ProxyAttrs = CSSProperties & {
  transform?: string;       // "translate(x,y) rotate(deg cx cy) scale(s)" — rotate about the element's bbox center (cx,cy), see §5
  "clip-path"?: string;     // e.g. "url(#logo-clip-…)"
};
export interface Proxies { [id: string]: ProxyAttrs }
```

New **injected element** map, separate from proxies because these create nodes rather than override them:

```ts
export interface InjectedElement {
  id: string;                       // the element's id (also the mount key)
  mount: "defs" | "container";      // #svg-edit-defs vs. the editor content container
  markup: string;                   // sanitized SVG fragment (one root element)
  order?: number;                   // stable paint order within the mount
}
export interface SVGInstance {
  pan: [number, number];
  zoom: number;
  proxies: Proxies;
  injected?: { [id: string]: InjectedElement };   // NEW
  content: string | undefined;
}
```

### 2. Actions + reducer — [store/actions.ts](../../store/actions.ts) / [store/slice.ts](../../store/slice.ts)

Add `addInjectedElement` / `updateInjectedElement` / `deleteInjectedElement` (command + event pairs), reducers mirroring the existing `addProxy` / `updateProxy` / `deleteProxy` cases (slice.ts:200-317). The `updateProxy` reducer already merges partial `changes` onto the existing entry, so transform/clip overrides need no new merge logic.

### 3. Render injected elements before applying proxies — [hooks/useSVGEditor.ts](../../hooks/useSVGEditor.ts)

In `renderPreview` (useSVGEditor.ts:119), after `parsedSVG` is resolved and **before** the proxy/highlight pass:

- Mount each `injected` entry whose `mount === "defs"` into the existing `#svg-edit-defs` defs block. Do this in the **defs builder** (`container.content[0]`), right after the `#pick-hatch-pattern` join, as its **own keyed d3 join**: `defs.selectAll(".injected-def").data(defsEntries, d => `${d.id}::${digest(d.markup)}`).join(enter => …parse markup with DOMParser, append first element, stamp `id`…)`. The key gives enter/exit semantics so a deleted injection is removed and a new one mounts. **The key must include a digest of `markup`, not just `d.id`.** d3's `update` branch cannot mutate already-parsed DOM in place (the markup was consumed by `DOMParser` on enter), so keying by `id` alone leaves the `update` branch a no-op and a re-derived def (e.g. a **re-cropped logo `<symbol>`**, or a `<clipPath>` whose target changed) keeps its stale DOM — the main-copy `<img>` re-renders from the document but in-content `<use>` placements keep showing the original. Including the markup digest in the key means a changed entry exits-and-re-enters (re-parsed), while the re-applied `id` keeps every `<use href="#id">` resolving. The digest is memoized by entry identity (Redux only re-allocates a changed entry) so unchanged large logo markup isn't re-hashed every zoom/drag frame. Order by sorting `defsEntries` on `order` before binding (and `selection.order()` after join). This is safe against both wipes: the defs joins are keyed to specific selections and never remove unmatched siblings, and `renderPreview`'s `selectChildren("*").remove()` operates on the **preview** group (`content[1]`), not the defs block — so defs injections persist across renders without re-mounting.
- Mount each `mount === "container"` entry **into `parsedSVG` itself** (the Redux-held SVG instance), not the surrounding editor `<g>`. This is required so the existing proxy loop can reach them: that loop resolves elements via `parsedSVG.querySelector(`#${id}`)` (useSVGEditor.ts:138), and `parsedSVG` is only appended to the container *after* the proxy pass (useSVGEditor.ts:243). Mounting into `parsedSVG` keeps injected placements inside the queried subtree. Order within `parsedSVG` by `order`. **Do this inline at the top of `renderPreview`, before the proxy pass** — not via the `beforeInjection(svgRoot)` host hook, which runs at append time (:243), *after* the proxy loop, and would therefore miss it. Inline keeps the mount ordering correct and SVG-module-owned. Each `renderPreview` re-derives `parsedSVG`, so these container injections re-mount fresh every pass (idempotent by construction).
- Then the existing proxy loop (useSVGEditor.ts:136-147) applies `transform` / `clip-path` to injected elements by id — so a placement `<use>` gets its transform and clip from a proxy keyed by the same id.

Add `injected` to the `renderPreview`/`useLayoutEffect` dependency list (useSVGEditor.ts:88-96) so injections re-render like proxies do.

`markup` is always sanitized by the caller; the editor additionally parses it in isolation (`DOMParser`) and mounts only the first element node, never `innerHTML` on a live node.

### 4. svgtoolbox — manipulation tools in the toolkit — [interfaces.ts](../../interfaces.ts) / [components/SVGEditorToolkit.tsx](../../components/SVGEditorToolkit.tsx)

Extend `EditorToolkit.tools` with a `manipulate` tool alongside `pickElement`:

As part of this change, **rename the existing misspelled `hightlightedElements` field to `highlightedElements`** (the snippet below uses the corrected spelling). The rename is contained to the SVG module — 8 occurrences across [interfaces.ts:33](../../interfaces.ts#L33), [hooks/useSVGEditor.ts](../../hooks/useSVGEditor.ts) (:94, :150-151, plus the `:149` comment), and [components/SVGEditorToolkit.tsx](../../components/SVGEditorToolkit.tsx) (:18, :46, :51, :62) — with no consumers outside the module.

```ts
tools: {
  highlightedElements: string[];      // renamed from hightlightedElements
  pickElement: { … };                 // existing
  manipulate: {                        // NEW — the svgtoolbox (spatial editing only)
    enabled: boolean;
    targetId?: string;                 // the injected element currently selected
    mode: "idle" | "drag" | "rotate" | "scale" | "clip";
    onTransform: (id: string, t: { x: number; y: number; rotation: number; scale: number }) => void; // move + rotate + VISUAL scale
    onClip: (id: string, clipTargetId: string) => void;   // delegates to pickElement under the hood
  };
}
```

Toolkit provider gains `selectManipulable(id)`, `setManipulateMode(mode)`, `cancelManipulate()` (same shape as the existing `pickElement` / `cancelPickElement` helpers in SVGEditorToolkit.tsx:77-99). Selecting an element enables the toolbox; the host wires `onTransform`/`onClip` to its actions. The toolbox is deliberately **spatial only** (move/rotate/scale/clip) — placement *lifecycle* (create/rename/delete) is owned by the host UI (the Composer placements pointer), so there is no `onCopy`/`onRemove` here. **`scale` is a purely visual transform factor** — the toolbox attaches no physical meaning to it; the host decides the semantics (for logos it adjusts rendering only and is never an input to cost). Physical sizing, if any, is a host concern set elsewhere.

### 5. Handle rendering + drag in d3 — `components/d3/` + useSVGEditor

When `manipulate.enabled` and a `targetId` is selected, render selection chrome into the existing `#SVG-editor-tools` group (useSVGEditor.ts:289-295) — a new `d3` component, e.g. `components/d3/ManipulationHandles.ts`:

- **Drag (move)**: `d3.drag` on the selected element body → `onTransform` with updated `x/y`.
- **Rotate**: a rotation handle drawn at the element's **top-right bbox corner with a small offset** → updates `rotation`. The logo rotates about **its own center**, not the document origin: emit the transform as `translate(x,y) rotate(rotation cx cy) scale(scale)`, where `(cx,cy)` is the element's local bbox center (from `getBBox()` on the untransformed element). The three-arg `rotate(deg cx cy)` form pivots on the center; without `cx cy` it would swing about the user-space origin (the bug this avoids). The drag measures the angle from `(cx,cy)` to the pointer.
- **Scale**: corner handles → `onTransform` with an updated visual `scale` (aspect preserved by default). View-only — the host attaches no physical/cost meaning to it.
- **Clip**: enters clip mode, which reuses the existing **pickElement** flow (useSVGEditor.ts:160-242) to pick the target element; on pick, `onClip(targetId, pickedId)`. The caller builds the `<clipPath><use href="#pickedId"/></clipPath>` injection and a `clip-path` proxy — matching the catalog reference SVG's `<use … clip-path="url(#clipPathNN)">` construction.

Creating, renaming, and deleting placements are **not** toolbox operations — the host surfaces those (for logos, the Composer placements pointer). The toolbox only edits the spatial transform/clip of the already-selected element.

Transforms are written through proxies (`transform` attr) and clips through an injected `<clipPath>` + `clip-path` proxy.

**Commit target.** A commit serializes `parsedSVG` and persists it via `updateSVG`, which writes **only** to the per-instance `instances[<name>].content` ([slice.ts updateSVG case](../../store/slice.ts#L319-L340)) — saved to **session-level storage** (`.session/SVG/svgs/<path>/instances/<name>.svg`, slice.ts:51-59). This is intended and safe: "non-destructive" means the commit never rewrites the **canonical** top-level document (`svgs[path].content`) nor the Jazz-synced **graph** (which stays the source of truth and is reconciled into the overlay on load). The instance content is the local render-cache tier, so the same commit path `pickElement` uses today is fine for the manipulate/clip commit too — it does not need a separate "proxy/injection only, never `updateSVG`" path.

### 6. Toolbox toolbar + shortcuts (host-rendered, SVG-owned bindings)

Export a `SVGToolbox` overlay component (toolbar of buttons, each wrapped in the host's `ShortcutHint`) and register its bindings under a dedicated `SVG/Toolbox` shortcut context. Keys (active only while an element is selected):

| Action | Binding |
|---|---|
| Rotate mode | `r` |
| Scale mode | `s` |
| Clip into element (pick) | `x` |

Drag (move) is pointer-native (no key). Copy / rename / delete are **not** toolbox bindings — placement lifecycle is the host's responsibility (for logos, the Composer placements pointer with its own `a`/`e`/`d` context). Bindings live in the SVG module so every editor host inherits them; the Composer draw view simply mounts the toolbar. Each control ships a visible `ShortcutHint` (workspace CLAUDE.md rule).

### 7. Sanitizer coverage — [utils/sanitizeSvg.ts](../../utils/sanitizeSvg.ts)

Injected `markup` originates from user uploads (logo SVGs) and from generated fragments. Confirm/extend the sanitizer to safely allow `<symbol>`, `<use>`, `<image>` (incl. data-URL `href`/`xlink:href`) and `<clipPath>` while stripping scripts, event handlers, and external resource refs.

## Decisions

- **Persistence of `injected`.** Jazz-synced **graph nodes are the source of truth** (the host feature's nodes); the `injected` overlay (and its transform/clip proxies) is a **derived render cache**. On load, the host (Composer) rebuilds the overlay from the logo nodes' `source`/`placements`; the instance session ([slice.ts persistState](../../store/slice.ts#L33-L72)) still serializes `injected` alongside proxies as a **local cache** so the editor can paint immediately before the graph is reconciled, but it is never authoritative. A divergence between the cached overlay and the graph is resolved in favor of the graph (rebuild and overwrite the cache). This means `injected` does **not** sync independently across collaborators — only the graph nodes do.
- **Generality.** `manipulate` is written generically (operates on any injected element id), not logo-specific, so future features (e.g. annotations) can reuse it. Likewise the proxy/injected extension lives in the SVG kernel, not Composer.
- **Handles scale with zoom.** Manipulation handles render inside the zoomed content group and **scale together with the zoom transform** like the rest of the SVG — no constant-pixel counter-scaling against `liveTransformRef`. Simpler to implement (handles are just SVG geometry in user space) and consistent with how the drawing zooms as a whole. **No min/max hit-target clamping for v1** — handles getting small when zoomed far out / large when zoomed in is accepted as-is; revisit only if it proves annoying in practice.
- **`<use>` ignores the referenced root `<svg>` viewBox — crop via clip-path, not viewBox.** A placement `<use>` renders the referenced symbol's **raw content** in the editor; it does **not** apply the symbol's root `viewBox`/`width`/`height` (only a `<use>` carrying its *own* `width`/`height` establishes a viewport). So an SVG logo cropped by merely narrowing the document's root `viewBox` crops the `<img>` main copy but **not** the placement — the placement shows the full, pre-crop drawing. The crop ([logoCut.ts `cropSvg`](../../../../system/modules/Composer/components/viewports/LogoListAccordion/logoCut.ts)) therefore **re-origins the sub-rect to `[0,0]` and clips the content with a `logo-crop-…` `clip-path`** (clip-path *does* propagate through `<use>`), and the manipulation outline boxes a cropped placement to the **crop rect** (the cropped symbol's root `width`/`height`) instead of `getBBox()` — `getBBox()` ignores both viewport and clip and still reports the full unclipped geometry, which would draw an oversized, wrong-shaped outline. Detection is the presence of a `logo-crop-…` clip in the referenced symbol; uncropped elements keep using `getBBox()`.
- **Selection chrome color is host-supplied.** `renderManipulationHandles` takes a `color` (outline + handles), passed by the host. The Composer draw view passes `theme.palette.secondary.main` so logo **placements** read as secondary-colored, visually distinct from the primary-colored main-copy overlay. Defaults to the prior blue when omitted.

## Status notes

Draft — implementation contract; no code written. The SVG-side gaps are resolved into the sections above. The product-side decisions that live in the sibling [Composer change doc](../../../../../system/modules/Composer/docs/changes/2026-06-04-317d5d-logos-embroidery-silkscreen.md) (same id) — cost-expression inputs, `methodFactor`/`gradesTotal`, master-placement anchor/scale, raster-quantization boundary — are likewise resolved there. The pair is ready to break into an implementation task list.

## Security

- All injected `markup` is sanitized before reaching the store and re-parsed in isolation at mount; the editor never sets `innerHTML` on a live node and mounts only the first parsed element. This is the primary new attack surface — user SVG rendered into the live editor DOM. Sanitizer must strip `<script>`, `on*` handlers, `<foreignObject>`, and external (`http(s)`/`file`) resource references; allow only `data:` image hrefs with an image MIME allow-list.
- `clip-path` / `transform` proxy values are caller-generated strings written as attributes; constrain them to the known shapes (`url(#id)`, the transform function set) rather than passing arbitrary attribute text.
- **Element lookups by id must use exact-match, never interpolated CSS selectors.** Placement/injection ids now originate from host feature data and, transitively, MCP input, so an id interpolated into a `#${id}` selector is a CSS-selector-injection / breakage vector. The proxy loop's `parsedSVG.querySelector(`#${id}`)` (useSVGEditor.ts:138) is the **one** offending call site and **must be changed** to `parsedSVG.getElementById(id)` (exact attribute-equality), matching the already-safe highlight lookup at :152 and the sibling Composer doc's `[id="…"]` rule. No other interpolated-id selector exists in the module (`useSVG.ts`/`useSVGEditor.ts` `querySelector("svg")` are literal). As defense-in-depth, also constrain injected ids to a safe charset (`[A-Za-z0-9_-]`) at the store boundary.
- No new IPC or network surface; all overlay state is local to the renderer + existing session persistence.

## Performance

- Injection and proxy application run inside the existing `renderPreview` pass; no new render pass. Keep mounts idempotent (de-dupe by id) so repeated `renderPreview` calls (proxy/tool/zoom changes) don't accumulate DOM nodes — this is the main risk and must be covered by a render-stability check.
- Manipulation handles re-render on drag; throttle transform proxy dispatches (the editor already debounces zoom saves, SVGModelViewport.tsx:30-33) so a drag doesn't dispatch on every pointermove — dispatch on dragend / throttled during drag, with the live transform applied directly to the DOM in between.
- Overlay growth is O(injected elements). Bounded by placement count from the host feature.
