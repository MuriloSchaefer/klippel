---
id: 2026-06-04-317d5d
name: Logos (embroidery / silk-screen)
description: Add a per-garment Logos feature — accordion + shortcuts + MCP tools mirroring Materials/Visualization, a draw-view svgtoolbox for copy/rotate/scale/drag/clip, raster color-quantization, elective gating, and material-like cost with an audit panel.
status: draft
modules: [Composer, SVG]
---

## Context

Users need to place **images** (logos) onto a garment model and configure them as **embroidery** or **silk-screen** print. The interaction must match the rest of the ModelViewport: a settings-panel **accordion** with keyboard shortcuts (like [Materials](../../components/viewports/MaterialListAccordion/), [Visualization](../../components/viewports/VisualizationListAccordion/), Electives, Processes), plus MCP click/shortcut tool pairs and E2E coverage.

In the **draw view** ([SVGModelViewport.tsx](../../components/viewports/ModelViewport/SVGView/SVGModelViewport.tsx)) each logo appears **once at the top** (a "master" placement); the user can then **copy** it as many times as desired, and **rotate / scale / drag** each copy, and **clip** any copy inside another SVG element. Clipping must behave exactly like [manga-curta-raglan.svg](../../../../../../public/catalog/2026/fem/camisas/manga-curta-raglan.svg): a transformed instance referencing a named clipPath, e.g. `<use … transform="matrix(…)" clip-path="url(#clipPath774)">` (line 673–680), where `<clipPath clipPathUnits="userSpaceOnUse">` (line 214+) wraps the geometry to clip into.

Copy / rotate / drag / clip live in a new **svgtoolbox** in the SVG kernel module (see the sibling SVG change doc, same id). This document covers the Composer-side data model, accordion UI, shortcuts, variation actions, cost computation, and MCP/tests.

### Product decisions (from requester)

- **Source: both raster and vector.** A raster upload (PNG/JPG) is **color-quantized** down to the logo's declared *number of colors* and embedded as `<image>`, with a warning that an SVG must be supplied later for production. An SVG upload passes through (sanitized) with no quantization.
- **Each logo has:** a number of colors, a physical size in cm, and a method (embroidery | silk-screen).
- **Elective gating:** a logo can be linked to an elective; when the elective is disabled the logo must **not appear** and must **not contribute cost** — same pattern as `ProcessNode.electiveNodeId`.
- **Cost is material-like:** the user defines a cost **expression** over `colors`, `size`, `method`, and `grades`; the accordion computes the price and shows an **audit panel** like materials.
- **Persistence:** extend the **SVG proxy model** to carry transforms + injected elements (see sibling SVG doc) rather than mutating the saved SVG document. Logos are a non-destructive overlay.

## Change

### Data model (graph node) — [typings.ts](../../typings.ts)

A new garment-scoped node type `LOGO`, mirroring `MaterialNode` / `VisualizationNode`:

```ts
export type LogoMethod = "embroidery" | "silkscreen";

export type LogoPlacement = {
  placementId: string;                 // small hash, unique within the logo
  name: string;                        // user-facing, e.g. "Manga direita", "Peito esquerdo"
  master?: boolean;                    // marks the placement auto-created on addLogo; descriptive only — NOT delete-protected (any placement is removable)
  size: { width: UnitValue; height: UnitValue }; // PHYSICAL size of THIS placement; drives its cost. Set only via the pointer.
  transform: { x: number; y: number; rotation: number; scale: number }; // position (user units) + rotation (deg) + VISUAL scale
  clipTargetId?: string;               // id of the SVG element to clip into
};

export type LogoSource =
  | { kind: "svg"; documentId: string }                       // → DOCUMENT node holding sanitized markup, injected as <symbol>
  | { kind: "raster"; documentId: string; pendingVector: boolean }; // → DOCUMENT node holding quantized image, injected as <image>

export type LogoNode = Node & {
  type: "LOGO";
  label: string;
  logoId: string;                      // small hash
  method: LogoMethod;
  colors: number;
  defaultSize: { width: UnitValue; height: UnitValue }; // seeds new placements (incl. the master); UnitValue from Converter ({ unit, amount }), e.g. { unit: "cm", amount: 8 }
  source: LogoSource;
  electiveNodeId?: string;             // optional elective gate (same field as ProcessNode)
  costExpression?: string;             // numeric expression over { colors, width, height, methodFactor, gradesTotal }
  computedCost?: CompoundValue;        // written back by the middleware's bulk LOGO loop
  costAudit?: LogoCostAudit;
  placements: LogoPlacement[];         // may be empty (logo with 0 placements → cost 0, nothing rendered); placements[0] is the initial auto-created one when present
};
```

New edges `HasLogoEdge` (`HAS_LOGO`) / `LogoOfEdge` (`LOGO_OF`) between `garment` and the logo node, mirroring `HAS_MATERIAL` / `MATERIAL_OF`. Add `LogoNode` to the `VariationGraphState.nodes` union and the edges to the `edges` union.

#### Document node (generic blob storage) — new, shared

Logo assets are stored as a new **`DOCUMENT`** node rather than a workspace blob. The blob lives **inside graph state as a base64 string**, so it rides the existing Jazz graph sync and there is no separate asset store to keep in sync (the user's explicit simplification). This node is intentionally generic — it will later hold draw-view SVGs, plotter files, orders, receipts, etc. — but this change implements only the minimum needed for logos while leaving the type open to other kinds:

```ts
export type DocumentNode = Node & {
  type: "DOCUMENT";
  documentId: string;                  // small hash; referenced by LogoSource.documentId (and future hosts)
  kind: string;                        // open discriminator — "logo-svg" | "logo-raster" now; "plotter" | "receipt" | "order" | "draw-svg" later
  mime: string;                        // e.g. "image/svg+xml", "image/png"
  filename?: string;                   // original upload name, for display/export
  encoding: "base64";                  // only encoding for now; field present so other encodings can be added without migration
  data: string;                        // base64-encoded blob content (sanitized SVG markup or quantized raster bytes)
};
```

New edges `HasDocumentEdge` (`HAS_DOCUMENT`) / `DocumentOfEdge` (`DOCUMENT_OF`) link an owner node to its document(s) — for logos, `LOGO → DOCUMENT`. Add `DocumentNode` to the `VariationGraphState.nodes` union and the edges to the `edges` union. The edge (not just the `LogoSource.documentId` field) is what lets `removeLogo` find and clean up the orphaned document, and lets future features attach documents to any node. Keep the node generic: nothing logo-specific leaks into `DocumentNode` — logo semantics stay in `LogoSource`/`LogoNode`, which merely *references* a document by id.

`LogoCostAudit` mirrors the material/process audit shape but is **broken down per placement**: one entry per placement carrying its `name`, its own `size`, the substituted variable values, and its resulting cost; plus the **summed total** across all placements. Elective-gated logos record `skipped: true` + `skipReason` and contribute 0. This reuses the existing audit-content rendering pattern (a list of steps with a running total), where each "step" is a named placement.

### Persistence — extend SVG proxies (overlay, non-destructive)

Logos do **not** mutate the variation's saved SVG document. Each placement is rendered by the SVG editor from the **proxy/injected overlay** added in the sibling SVG change doc:

- An **injected `<defs>` entry** per logo source, built by **decoding the referenced `DOCUMENT` node's base64 `data`** (resolved via `LogoSource.documentId`): a `<symbol id="logo-sym-<logoId>">…</symbol>` wrapping the decoded SVG markup for SVG sources, or, for raster, an `<image>` whose `href` is a `data:<mime>;base64,<data>` URL assembled from the document's `mime` + `data`. The decode happens in the overlay-derivation step at model-open time (and on logo add/edit); the graph node + its document are the source of truth, the injected defs are derived. If `documentId` resolves to no `DOCUMENT` node (deleted, or not yet synced in), derivation **skips that logo's injection and surfaces a "missing asset" chip** on the row rather than throwing — the logo node still exists and re-renders once the document syncs.
- An **injected container element** per placement: `<use href="#logo-sym-<logoId>" id="logo-<logoId>-<placementId>">` (or `<image id=…>` for raster).
- A **transform/clip proxy** keyed by the placement element id: `{ transform: "translate(x,y) rotate(deg) scale(s)", "clip-path": "url(#logo-clip-<placementId>)" }`.
- An **injected `<clipPath>`** when clipped: `<clipPath id="logo-clip-<placementId>" clipPathUnits="userSpaceOnUse"><use href="#<clipTargetId>"/></clipPath>` — the same construction as the reference SVG.

Composer's [useVariationActions](../../hooks/useVariationActions.ts) dispatches the new SVG `addInjectedElement` / `updateInjectedElement` / `deleteInjectedElement` actions alongside `addProxy`/`updateProxy`/`deleteProxy`, exactly as `addVisualization` already dispatches proxy actions today (useVariationActions.ts:300-315).

### Variation actions — [useVariationActions.ts](../../hooks/useVariationActions.ts)

New actions (each `markChanged()` and dispatches graph + SVG-overlay actions):

| Action | Effect |
|---|---|
| `addLogo(input)` | Creates the `DOCUMENT` node (base64 of the sanitized SVG or quantized raster) + `HAS_DOCUMENT`/`DOCUMENT_OF` edges, the `LOGO` node (`source.documentId` → that document) + `HAS_LOGO`/`LOGO_OF` edges; derives the source `<symbol>`/`<image>` into defs (decoding the document) and the **master placement** `<use>` at top-center, sized from `defaultSize`. |
| `updateLogo(nodeId, changes)` | Updates logo-wide fields (method/colors/defaultSize/costExpression). Replacing the source file, or re-quantizing a raster when `colors` changed, updates the **document node's `data`/`mime`** in place (same `documentId`); the overlay re-derives from the new bytes. **Replacing the source file re-baselines every placement's visual `transform.scale`** against the new source's intrinsic size, so placements keep their on-garment appearance (and don't suddenly jump) when e.g. an SVG is supplied for a `pendingVector` raster. Physical `size` is untouched, so cost is unaffected. |
| `removeLogo(nodeId)` | Removes the logo node, **all its placements** (their injections, transform/clip proxies, and clipPaths), the source symbol, the edges, **and the owned `DOCUMENT` node + its `HAS_DOCUMENT`/`DOCUMENT_OF` edges** (a logo owns its document 1:1, so it's safe to delete with the logo). |
| `addLogoPlacement(nodeId, name?)` | Copy: clones the last placement (size + transform) at an offset with a new name (default e.g. `"Cópia N"`), injects a new `<use>` + transform proxy. **When the logo has no placements** (all were removed), there is nothing to clone, so it seeds a fresh placement from `defaultSize` at top-center — the same construction `addLogo` uses for the initial placement. |
| `updateLogoPlacement(nodeId, placementId, transform)` | Drag/rotate/**scale (visual)**: writes the transform proxy (`translate`/`rotate`/`scale`). Scale here is **view-only** and does **not** re-cost — it just adjusts how the logo sits on the garment in the draw view. |
| `resizeLogoPlacement(nodeId, placementId, size)` | Sets the placement's **physical** `size` (only from the pointer's size field); re-costs that placement. Independent of the visual `transform.scale`. |
| `renameLogoPlacement(nodeId, placementId, name)` | Renames a placement (the name shown in the placements pointer and the cost audit). |
| `clipLogoPlacement(nodeId, placementId, clipTargetId)` | Injects `<clipPath><use href="#target"/></clipPath>` and sets the placement's `clip-path` proxy. |
| `removeLogoPlacement(nodeId, placementId)` | Deletes the placement injection + proxy and drops it from the cost sum. **Any placement is removable, including the initial/auto-created one — there is no minimum-placement floor.** A logo may end up with **0 placements**: `computedCost` becomes 0, nothing is injected into the SVG, but the logo node + its document still exist and the row stays in the list so placements can be re-added. |
| `linkLogoElective(nodeId, electiveNodeId)` | Sets `electiveNodeId`; mirrors the process→elective link. |

### Cost computation (material-like) + audit

- New `computeLogoCost.ts` under [utils/](../../utils/) mirroring [computeMaterialCost.ts](../../utils/computeMaterialCost.ts). The algorithm is:
  1. **For each placement**, evaluate `costExpression` over the input context `{ colors, width, height, methodFactor, gradesTotal }` using the Converter expression engine (the same `jse-eval`-based evaluator [convert.ts](../../../Converter/utils/convert.ts) uses for process time / material cost), producing that placement's cost.
  2. **Sum the per-placement costs** to produce the logo's `computedCost: CompoundValue`.
- **All five inputs are scalars (numbers).** This is a hard constraint of the Converter engine, not a stylistic choice: `convert.ts` builds the evaluation context as `{ [name]: number }` and **silently drops any non-number param** ([convert.ts:158-167](../../../Converter/utils/convert.ts#L158-L167)), extracts identifiers with a bare `[a-zA-Z]\w*` regex (so a string literal like `"embroidery"` is parsed as a *phantom identifier* and a property access like `grades.amount` splits into two identifiers), registers only `sqrt` as a custom op (**no `sum`**), and **bails entirely if any identifier is missing from context** ([convert.ts:178-181](../../../Converter/utils/convert.ts#L178-L181)). So `method` cannot be a string and `grades` cannot be an array — both are pre-reduced to numeric scalars before evaluation.
- Inputs:
  - `width`/`height` come from **the placement's own physical `size`** (`UnitValue`s) — each placement can be a different physical size and therefore cost differently. They are **normalised to a canonical unit via the Converter** (e.g. cm) before being injected as scalar amounts, so the author writes plain `width * height` regardless of the entered unit; normalisation steps are recorded in the audit (mirroring `attributeNormalisations`).
  - `colors` is the logo-wide color count (number).
  - **`methodFactor`** is the logo-wide numeric weight for the print `method`, mapped from the method enum via a documented table (e.g. `embroidery → 1.0`, `silkscreen → 0.6` — exact factors TBD with the requester). `method` is **not** exposed as a string, because the engine would treat `"embroidery"` as a phantom identifier and bail; instead the author multiplies by `methodFactor`. Flipping a logo's `method` changes `methodFactor`, so the cost changes — which is what `cost.e2e.test.ts` asserts.
  - **`gradesTotal`** is a single number = the **sum of all `GRADUATION` node `amount`s** (total piece count across grades, e.g. `[{label:"P",amount:10},{label:"M",amount:20}]` → `gradesTotal = 30`). `computeLogoCost` does the summation (the engine has no `sum` and cannot take an array); the author chooses whether cost scales with volume — `colors * width * height * methodFactor` ignores it, `… * gradesTotal` scales by total pieces. **This is why graduation/quantity changes trigger recompute** (resolving the prior "does logo cost scale with grades?" question: it scales only if the expression references `gradesTotal`). Per-grade math (a different factor per grade) is **out of scope**; it would require registering a `sum`/aggregate plugin and passing arrays, a future change.
  - The placement's **visual `transform.scale` is never an input to cost** — it only affects rendering, so dragging a scale handle in the draw view leaves the price unchanged.
- The audit (`LogoCostAudit`) lists each placement by `name` with its `size`, the substituted inputs (incl. `methodFactor` and the `gradesTotal` value plus the per-grade breakdown it was summed from), and its cost, plus the summed total.
- **Elective gating:** if `electiveNodeId` is set and the elective `value === false`, cost is skipped (audit `skipped: true`, `skipReason`), exactly like [computeProcessTime.ts:39-43](../../utils/computeProcessTime.ts#L39-L43). The recompute-on-toggle path is the **same proven chain `ProcessNode` already uses** (verified against current code): toggling an elective calls `updateElective` → `updateNode` ([useVariationActions.ts:231-243](../../hooks/useVariationActions.ts#L231-L243)); the graphInstance middleware re-emits it as `nodeUpdated` ([graphInstance/middlewares.ts:69-81](../../../../../kernel/modules/Graphs/store/graphInstance/middlewares.ts#L69-L81)); the computation middleware matches `nodeUpdated` and runs the LOGO bulk loop. `computeLogoCost` resolves the elective **by id from `graphState.nodes[electiveNodeId]`** (its `value` lives on the graph node — [typings.ts ElectiveNode](../../typings.ts#L184)), not a separate slice — so no logo→elective edge is needed, mirroring how processes already read it. If the referenced elective node is **deleted** while a logo still points at it, the by-id lookup resolves to `undefined` and the logo is treated as **ungated** (cost counts, placements render) — identical to the existing `ProcessNode` behavior, so no extra cleanup ships here; a stale `electiveNodeId` is harmless beyond losing the gate.
- Wired through the existing computation middleware ([store/computation/middlewares.ts](../../store/computation/middlewares.ts)) by adding a **third bulk loop** for `LOGO` nodes alongside the existing MATERIAL (middlewares.ts:60) and PROCESS (middlewares.ts:82) loops: on every non-conversion graph action (debounced 300ms) recompute **all** logos and write back `computedCost`/`costAudit`. **No change to `COMPUTED_WRITE_BACK_KEYS` is needed** — the LOGO loop writes back exactly `computedCost` and `costAudit`, both of which the set already contains ([middlewares.ts:20-30](../../store/computation/middlewares.ts#L20-L30), shared with the MATERIAL loop), so the existing cycle-break (`keys.every(k => COMPUTED_WRITE_BACK_KEYS.has(k))`) already suppresses the self-retrigger. This recomputes cost on logo edits, elective toggles, and graduation/quantity changes for free (any of those is a graph action), exactly like materials/processes — no per-node hash gating.
- A `useLogoCostComputation` hook under the new accordion mirrors [useMaterialCostComputation.ts](../../components/viewports/MaterialListAccordion/hooks/useMaterialCostComputation.ts), and the audit UI reuses the structure of [MaterialCostAuditContent.tsx](../../components/viewports/MaterialListAccordion/components/MaterialCostAuditContent.tsx).

### Accordion UI — `components/viewports/LogoListAccordion/`

New accordion in the SettingsPanel of [ModelViewport/index.tsx](../../components/viewports/ModelViewport/index.tsx) (name `"Logos"`, an image icon), wrapped in a `FocusShortcutProvider` with a new `LOGO_LIST_CONTEXT_ID`. Structure mirrors VisualizationListAccordion:

```
LogoListAccordion/
  index.tsx                       (list root, data-testid="logo-list")
  AddLogoButton.tsx               (PointerContainer form: name, method, colors, default size w×h + unit, cost expression, source upload)
  LogoItem.tsx                    (row: label, method/colors/size chips, computed cost (summed) + audit button, placements button, link-elective, edit, delete; tabIndex=0)
  LogoPlacementsButton.tsx        (row action icon button → opens a PointerContainer listing placements: add / rename / delete from inside the pointer)
  LogoEditButton.tsx
  LogoCostInfo.tsx / LogoCostAuditContent.tsx
  drivers/
    AddLogoButton.click.puppeteer.ts / .shortcut.puppeteer.ts
    LogoItem.click.puppeteer.ts   / .shortcut.puppeteer.ts
```

- The add/edit form accepts a file (PNG/JPG/SVG). Raster → send bytes + `colors` (1–10) to the main-process quantization IPC handler, store the returned quantized image as a `DOCUMENT` node (`kind:"logo-raster"`, `mime:"image/png"`, base64 `data`), set `source.pendingVector=true`, render a warning chip "Forneça um SVG para produção". SVG → sanitize via [sanitizeSvg.ts](../../../../../kernel/modules/SVG/utils/sanitizeSvg.ts), store the sanitized markup as a `DOCUMENT` node (`kind:"logo-svg"`, `mime:"image/svg+xml"`, base64 `data`). The injected `<symbol>`/`<image>` is derived from the document, not embedded directly in the form.
- Each logo row has a **placements** action icon button (`LogoPlacementsButton`, `data-testid="logo-item-placements"`) that opens a `PointerContainer` (same pattern as `AddVisualizationButton` / the process link-elective pointer). Inside the pointer: a list of placements showing each `name` and `size`, an **add** control (creates a copy at an offset, seeded from `defaultSize`), and per-row **rename**, **size** (width/height + unit), and **delete** controls (every row is deletable — no protected master; the list can go empty, and **add** re-seeds a placement from `defaultSize`). Placement names are what the cost audit groups by, e.g. logo "Marca empresa" → placements "Manga direita", "Peito esquerdo". Selecting a placement entry also selects it in the draw-view svgtoolbox — the pointer calls the SVG toolkit's `selectManipulable(placementElementId)` (exposed by the sibling SVG doc) with the placement's injected element id, so the host→kernel wiring is a single call, not shared state. **Spatial editing (move / rotate / scale / clip) stays in the svgtoolbox**, but the two scale concepts are distinct: the svgtoolbox scale handle writes the **visual** `transform.scale` (view-only, never costed), while the pointer's **size** field writes the placement's **physical** `size` (the cost input). The pointer manages placement *lifecycle, naming, and physical size*. (Visual scale exists because we don't yet trust the source SVG's intrinsic scale, so the user needs a handle to make the logo sit correctly on the garment regardless of its declared physical size.)
- Every interactive control wraps `ShortcutHint` for its binding (CLAUDE.md: no shortcut without a visible hint).
- **Canvas → accordion selection.** Clicking a logo's **main copy** (the DOM overlay) or any of its **placements** (in-content `<use>`) selects that logo in the accordion by focusing its row (`LogoItem` `ListItem` has `id={node.id}`, `tabIndex=0`, and a `:focus`/`:focus-within` highlight — the existing selection indicator). The main copy is React, so it focuses the row in its `onPointerDown`. Placements live in the editor SVG (not the overlay), so `LogoMainCopyOverlay` attaches one delegated `pointerdown` listener on `#svg-editor` and walks up from the target to the first element whose id is in a `placement-element-id → logo-node-id` map (built from all logos' `placements`, covering the `<use>` id and its `logo-clipwrap-…` wrapper). The focus helper expands the containing accordion first if it's collapsed so the highlighted row is visible. The delegated listener is registered unconditionally (before the overlay's `logos.length === 0` early return) so placements stay selectable even for logos without a main copy.

### Shortcuts — [kernelCalls.ts](../../kernelCalls.ts) + [constants.ts](../../constants.ts)

Two new contexts: `LOGO_LIST_CONTEXT_ID = ${MODULE_NAME}/LogoList` (the row list) and `LOGO_PLACEMENTS_CONTEXT_ID = ${MODULE_NAME}/LogoPlacements` (active only while the placements pointer is open, pushed/popped on its mount/unmount — same child-context pattern the visualization pick panel uses). CRUD bindings follow the project `a` / `e` / `d` convention scoped to each context:

| Action | Binding | Context |
|---|---|---|
| Toggle / focus logo list | `Ctrl+l` | `Composer/ModelViewport` |
| Focus next / prev logo | `ArrowDown` / `ArrowUp` | `Composer/LogoList` |
| Add logo (open panel) | `a` | `Composer/LogoList` |
| Edit focused logo | `e` | `Composer/LogoList` |
| Delete focused logo | `d` | `Composer/LogoList` |
| Open placements pointer (focused logo) | `p` | `Composer/LogoList` |
| Link focused logo to elective | `w` | `Composer/LogoList` |
| Open cost audit for focused logo | `l` | `Composer/LogoList` |
| Focus next / prev placement | `ArrowDown` / `ArrowUp` | `Composer/LogoPlacements` |
| Add placement (copy) | `a` | `Composer/LogoPlacements` |
| Rename focused placement | `e` | `Composer/LogoPlacements` |
| Delete focused placement | `d` | `Composer/LogoPlacements` |

The bare `a` / `e` / `d` keys don't collide because `Composer/LogoPlacements` only exists while the pointer is open and the list context yields to it, exactly as the visualization panel's `p` binding is scoped to its open panel.

The **draw-view svgtoolbox** shortcuts (copy / rotate / scale / clip / delete-placement) are registered in the **SVG kernel module** under its own toolbox context — see the sibling SVG change doc. The toolbar overlay that hosts them renders inside the Composer draw view but the bindings belong to the SVG module so any SVG editor host gets them.

### MCP tools — [mcpTools/](../../mcpTools/)

Paired click + shortcut tools (per [mcp-tool-reuse.md](../../../../../docs/mcp-tool-reuse.md) and the [no-page-evaluate memory](../../../../../../../.claude/projects/-home-schaefer-Documents-personal-klippel/memory/feedback_no_page_evaluate_in_tools.md)), registered in [mcpTools/index.ts](../../mcpTools/index.ts):

| Click | Shortcut |
|---|---|
| `addLogo.ts` | `addLogoShortcut.ts` |
| `editLogo.ts` | `editLogoShortcut.ts` |
| `deleteLogo.ts` | `deleteLogoShortcut.ts` |
| `addLogoPlacement.ts` (copy + `name` + transform + optional `clipTargetId`) | `addLogoPlacementShortcut.ts` |
| `renameLogoPlacement.ts` | `renameLogoPlacementShortcut.ts` |
| `resizeLogoPlacement.ts` | `resizeLogoPlacementShortcut.ts` |
| `deleteLogoPlacement.ts` | `deleteLogoPlacementShortcut.ts` |
| `focusLogoList.ts` | — |
| `cycleLogoFocus.ts` | — |

`addLogo` takes `{ name, method, colors, defaultSize:{width,height,unit}, costExpression?, sourceFixturePath, electiveLabel? }`. `addLogoPlacement` takes `{ logoLabel, name, size?, transform?, clipTargetId? }` (size defaults to the logo's `defaultSize`). Placement transforms, `size`, and `clipTargetId` are passed **as arguments** (the interactive drag/clip pickers cannot be driven without `page.evaluate`, which is forbidden in tool files); the human picker remains for manual use. Logo source files in tests come from fixtures (one small SVG, one small PNG) with stable element ids for clip targets.

### Tests

Per [e2e-tests.md](../../../../../docs/quality/e2e-tests.md), under `mcpTools/tests/`, both variants per suite, co-located drivers, no inline `page.evaluate`:

- `addLogo.e2e.test.ts` — upload SVG context (`uploadVariationSVG` + fixture with stable ids); add an SVG logo; assert a `LOGO` node and its owned `DOCUMENT` node exist (linked by `HAS_DOCUMENT`, `source.documentId` matching), the master `<use>` is injected into the live SVG, and the row appears.
- `addLogoPlacement.e2e.test.ts` — copy the master with a name (e.g. "Manga direita"); assert a second `<use>` exists, the placement appears in the row sub-list, and `renameLogoPlacement` updates the displayed name; apply a transform; assert the placement's `transform` proxy is applied; clip into a fixture element; assert `clip-path="url(#logo-clip-…)"` and that the `<clipPath>` references the picked element — the reference-SVG behavior. Also `deleteLogoPlacement` removes the entry and drops it from the cost sum.
- `electiveGate.e2e.test.ts` — link a logo to an elective; toggle the elective off; assert the placements disappear from the SVG and `computedCost` is skipped (audit `skipped`).
- `cost.e2e.test.ts` — set a cost expression over `colors`/`width`/`height`/`methodFactor`/`gradesTotal`; add two named placements with **different physical sizes**; assert `computedCost` equals the **sum** of per-placement costs and the audit lists each placement by name with its size and contribution; change a placement's **physical size** (via `resizeLogoPlacement`) and assert only that placement's cost (and the total) changes; use a `gradesTotal`-referencing expression (e.g. `… * gradesTotal`), change a graduation `amount`, and assert the cost tracks it; **apply a visual scale** via the svgtoolbox and assert `computedCost` is **unchanged** (view-only); flip `method` and assert `methodFactor` shifts the cost.
- `rasterImport.e2e.test.ts` — import a PNG fixture; assert the result palette is reduced to **≤ `colors`** distinct colors (algorithm-agnostic, satisfied by the v1 baseline quantizer), an `<image>` injection, and that `pendingVector` surfaces the warning chip.

Skip when CDP is unreachable, matching sibling Composer suites.

## Decisions

- **Source: both raster and vector.** Raster (PNG/JPG) is color-quantized to the logo's declared color count and embedded as `<image>` with a "supply an SVG for production" warning; SVG is sanitized and passed through as a `<symbol>`.
- **Cost is material-like.** Price is a user expression over the **numeric scalars** `colors`, `width`, `height`, `methodFactor`, and `gradesTotal`, evaluated **per placement then summed**, by the Converter engine, recomputed via a computation middleware, with an audit panel mirroring materials. The inputs are deliberately all numbers because the Converter engine accepts a numeric-only context (string `method` / array `grades` are pre-reduced to `methodFactor` / `gradesTotal` — see Cost computation).
- **Garment-total aggregation is out of scope (future change).** This change computes and audits each logo's `computedCost` (summed across its placements) and surfaces it in the accordion, but **how the summed logo cost rolls into the variation's overall garment cost total** — the `quotient`/`dividend` units it contributes, which aggregator consumes it, and whether it scales with quantity/graduation — is deferred to a **separate future change**. For now `computedCost` stands on its own in the Logos accordion; nothing downstream consumes it yet.
- **Elective gating.** A logo links to an elective via `electiveNodeId`; when the elective is off the placements are not rendered and cost is skipped — same pattern as `ProcessNode`.
- **Persistence / source of truth.** The logo **graph node is the source of truth**: `method`, `colors`, `defaultSize`, `source`, `costExpression`, `electiveNodeId`, and `placements[]` (each placement's `name`, `size`, `transform`, `clipTargetId`) all live on the node and ride the existing graph Jazz sync. The SVG overlay (injected `<symbol>`/`<image>`/`<use>`/`<clipPath>` + transform/clip proxies) is **derived** from those nodes on load and persists in the local SVG session (`.session/SVG`, [slice.ts persistState](../../../../../kernel/modules/SVG/store/slice.ts#L33)) only as a **render cache** — it never syncs independently. Implication: the variation actions write the node first, then (re)derive the overlay; on model open, a reconcile step rebuilds the overlay from the nodes and overwrites any stale cache.
- **Raster quantization: main process, up to 10 colors.** Color count is capped at **10** (`colors` ∈ 1–10, validated at the form + MCP-tool boundary). Quantization runs in the **Electron main process** (a new IPC handler in [electron/main/](../../../../../../electron/main/), alongside the existing Jazz/SVG main-process surface) — it keeps the heavy work off the renderer thread entirely and returns the quantized image + the resolved palette to the renderer. The renderer sends the raw upload bytes + target color count; the main process never persists the raw raster. **v1 ships a baseline quantizer** (e.g. a simple median-cut / posterization reducing the palette to ≤ `colors`) — concrete enough that `rasterImport.e2e.test.ts` can assert real palette reduction. What this change *fixes for good* is the **boundary**: the IPC channel (request `{ bytes, colors }` → response `{ image, palette }`) and that it lives in the main process; the **specific production-grade algorithm/library is deferred** and can be swapped behind that boundary without touching callers. The test asserts the result palette has ≤ `colors` distinct colors, **not** a specific algorithm, so swapping the implementation later won't break it. The returned `palette` (the resolved color list) is surfaced for display/debug and reserved for future use (e.g. an embroidery thread-color mapping); v1 stores only `image`.
- **`method` in the cost expression → resolved: numeric `methodFactor`.** The method is exposed to the expression as a **number** (`methodFactor`), mapped from the `embroidery | silkscreen` enum via a documented factor table, not as a string for `==` branching. This is forced by the Converter engine, whose context is numeric-only and which would parse a string literal as a phantom identifier and bail (see Cost computation). Flipping `method` changes `methodFactor` and therefore the cost.
- **Master placement position → resolved.** The master placement is anchored at the **top-center of the SVG `viewBox`** in user units: `x = viewBox.x + viewBox.width / 2` (centered on the logo's own bbox), `y = viewBox.y + margin` with a small top margin (~5% of `viewBox.height`). Its initial visual `transform.scale` is computed to **fit the source's intrinsic bbox to a target fraction of the viewBox** — `scale = (0.15 * viewBox.width) / sourceBBox.width` (≈15% of canvas width) — so a freshly-added logo is visible regardless of the source's declared physical size or the current zoom. Physical `size` is seeded independently from `defaultSize` and does not affect this initial scale.
- **Two-scale model (visual `transform.scale` vs physical `size`).** Visual scale is view-only and never costed; physical `size` drives cost. **Replacing a logo's source file re-baselines each placement's visual scale** to the new source's intrinsic size (so swapping a `pendingVector` raster for a real SVG preserves how each placement looks on the garment); physical `size` and therefore cost are untouched. The risk that a user *misreads* price because a logo looks large (visual scale) while its physical `size` is small is acknowledged but **deferred to a future change** — no audit-prominence/warning affordance ships now.
- **No minimum-placement floor.** `addLogo` auto-creates one initial placement (the `master`), but that placement is **descriptive, not protected**: any placement is removable and a logo may have **0 placements** (cost 0, nothing rendered, row still listed, placements re-addable via the pointer's add, which re-seeds from `defaultSize`). `removeLogo` deletes the logo and **all** its placements plus the owned document.
- **Asset storage: a generic `DOCUMENT` graph node, base64-inline.** The sanitized SVG / quantized raster lives in a new `DOCUMENT` node, base64-encoded in `data`, referenced by `LogoSource.documentId` and linked via `HAS_DOCUMENT`/`DOCUMENT_OF`. The blob rides the existing graph Jazz sync — **no separate workspace-blob store to keep in sync** (the deliberate simplification, chosen over the earlier workspace-blob idea). The node is generic so it can later hold draw-view SVGs, plotter files, orders, and receipts; this change builds only the minimum for logos (the node type, the two edges, `kind:"logo-svg"|"logo-raster"`, create/update/delete from the logo actions) while leaving `kind`/`mime` open for other document types. Trade-off accepted: base64 inflates the blob ~33% and bloats graph/sync payload — fine for small logos (bounded by the raster dimension/byte cap), to be revisited when large documents (plotter files) are added.

## Security

- Logo SVG uploads are arbitrary user SVG — **must** be sanitized via [sanitizeSvg.ts](../../../../../kernel/modules/SVG/utils/sanitizeSvg.ts) **before it is base64-encoded into the `DOCUMENT` node** (strip scripts, event handlers, external refs), since the markup is decoded and mounted into the live editor DOM. Sanitize on the way *in*, so the stored `data` is already safe and the decode-on-render path can trust it (but the SVG editor still re-parses in isolation per the sibling doc). Extend the sanitizer's test coverage for `<symbol>`/`<use>`/`<image>` and `xlink:href` data-URL handling.
- `clipTargetId`, `name`, and element ids are caller-supplied (MCP) — look up SVG elements by `[id="…"]` attribute equality, never by interpolating into a selector (same rule as the [visualization change](./2026-05-10-22ef00-visualization-shortcuts-mcp-tools.md#L157-L161)). Reject names/ids with quotes/angle brackets at the tool boundary.
- Raster blobs are base64-encoded into the `DOCUMENT` node; cap decoded image dimensions/bytes **before** quantization to avoid a memory-blow-up via a hostile upload, and bound the stored `data` size so a malicious upload can't bloat the synced graph.
- `costExpression` is evaluated by the Converter engine (`jse-eval`, no arbitrary JS / no `Function`); keep the variable allow-list to the numeric scalars `{ colors, width, height, methodFactor, gradesTotal }` and reject identifiers outside it. String/array variables are intentionally excluded — the engine's context is numeric-only and treats unknown identifiers (including bare string-literal words) as missing, so allowing them would be both unsafe-by-confusion and non-functional.
- No new IPC endpoints beyond the MCP tool surface; logo data is local + Jazz-synced under the existing model trust model.

## Performance

- The SVG overlay grows by one `<use>`/`<image>` per placement plus one `<clipPath>` per clipped placement; `renderPreview` already re-runs on proxy/tool changes. Keep injection idempotent and keyed by id so re-renders don't accumulate nodes. Expected cost is O(placements) per render — bounded by how many copies a user makes.
- Cost recompute is O(logos) per relevant edit — a **third bulk loop** in the computation middleware that recomputes **all** logos on any non-conversion graph action, same class and pattern as the existing MATERIAL/PROCESS loops (no per-node hash gating). For the expected handful of logos per garment this is negligible; it shares the 300ms debounce with the other loops, so a burst of edits collapses to one recompute pass.
- Raster quantization is the one heavy op; it runs in the Electron main process (off the renderer thread) so it never blocks the add-logo interaction. Still bound the input (decoded-dimension/byte cap before quantizing) to keep the main process responsive.
- **Base64 blobs ride graph sync.** Storing document bytes inline (base64, ~33% larger than raw) means logo assets travel in the Jazz graph payload rather than a side store. For a handful of small logos this is fine and bounded by the raster cap; but the pattern does not scale to large documents (plotter files), so the size cap on `DOCUMENT.data` matters and the decision should be revisited before non-logo document kinds with big payloads are added.
- Consider a perf check against the [performance-tests](../../../../../docs/analysis/performance-tests.md) harness only if logos are expected at high cardinality; for typical counts (a handful per garment) no dedicated perf test is warranted.
