---
id: 2026-05-10-22ef00
name: Visualization shortcuts and MCP tools
description: Add keyboard shortcuts plus paired click/shortcut MCP tools (with E2E tests) for the VisualizationListAccordion CRUD surface, with tests that upload an SVG, add a material, attach a visualization, and assert the SVG element fill/stroke follows the material color across edits.
status: draft
modules: [Composer]
---

## Context

[VisualizationListAccordion](../../components/viewports/VisualizationListAccordion/index.tsx) renders the per-garment list of "Visualização" entries inside the Composer `GarmentDetails` panel ([GarmentDetails.tsx:117](../../components/viewports/ModelViewport/DetailPanel/GarmentDetails.tsx#L117)). A visualization is a graph node of type `VISUALIZATION` that binds a `MATERIAL` node to a set of SVG element ids (`doms[] = { id, fill, stroke }`); when the bound material changes, [`updateMaterial`](../../hooks/useVariation.ts#L351-L386) walks the `HAS_VISUALIZATION` edges and pushes the new color hex into `svg.updateProxy(dom.id, { fill?, stroke? })`. This is the single behavior visualizations exist to provide — and today it has no automated coverage.

Today this surface has:

- No keyboard shortcuts on `Adicionar Visualização`, the inline edit `IconButton`s, or the row-level delete control.
- No `data-testid`s anywhere in [VisualizationListAccordion/index.tsx](../../components/viewports/VisualizationListAccordion/index.tsx) — neither on the add button, the row, the `Pick` button, the material `Select`, nor the fill/stroke toggles. MCP cannot reach this flow.
- No co-located `*.puppeteer.ts` drivers (the file is a single flat `index.tsx`).
- The "pick element from SVG" affordance ([svgToolkit.pickElement](../../components/viewports/VisualizationListAccordion/index.tsx#L205-L217)) is a click-driven interactive picker. MCP cannot drive a free-form click-the-SVG flow without `page.evaluate`-style cheats (forbidden per the [no inline page.evaluate memory](../../../../../../../.claude/projects/-home-schaefer-Documents-personal-klippel/memory/feedback_no_page_evaluate_in_tools.md)). The MCP path therefore takes `domIds: string[]` directly as an argument and bypasses the picker, while the picker remains the human path with a shortcut to invoke it.

This change brings visualizations to parity with the material/graduation/SVG-upload MCP surfaces (`addMaterial`, `addGraduations`, `uploadVariationSVG`): shortcut-discoverable controls with `ShortcutHint`, paired click/shortcut MCP tools per CRUD action, and an E2E suite that exercises the actual material→SVG color binding the feature exists for.

The store-level actions are already in place — [`addVisualization`](../../hooks/useVariation.ts#L206), [`removeVisualization`](../../hooks/useVariation.ts#L272), [`updateVisualization`](../../hooks/useVariation.ts#L281), and the proxy-pushing branch of [`updateMaterial`](../../hooks/useVariation.ts#L351-L386) — so this change is UI affordances, MCP plumbing, and tests; no new graph mutations.

## Change

### New / modified component surface

[VisualizationListAccordion/index.tsx](../../components/viewports/VisualizationListAccordion/index.tsx) — split the file so each interactive surface owns its drivers cleanly (matching the [GraduationListAccordion](../../components/viewports/GraduationListAccordion/) layout):

```
VisualizationListAccordion/
  index.tsx
  AddVisualizationButton.tsx                       (extracted)
  VisualizationItem.tsx                            (extracted)
  VisualizationEditButton.tsx                      (extracted)
  drivers/
    AddVisualizationButton.click.puppeteer.ts
    AddVisualizationButton.shortcut.puppeteer.ts
    VisualizationItem.click.puppeteer.ts
    VisualizationItem.shortcut.puppeteer.ts
```

UI affordances:

- The accordion list root gets `data-testid="visualization-list"`.
- Each `VisualizationItem` row gets `data-testid="visualization-item"` + `data-visualization-label="<node.label>"` + `tabIndex={0}` so the shortcut path can resolve the focused row via `document.activeElement.closest('[data-testid="visualization-item"]')`, mirroring the material/graduation pattern.
- Row focus styling matches [MaterialItem.tsx:77-83](../../components/viewports/MaterialListAccordion/components/MaterialItem.tsx#L77-L83): primary-colored border on `:focus, :focus-visible, :focus-within`. After save/cancel of the inline edit pointer, focus returns to the row via the same `refocusAfterEditRef` pattern.
- `AddVisualizationButton` trigger gets `data-testid="add-visualization"`. Inside its pointer panel: `add-visualization-name`, `add-visualization-material-select`, `add-visualization-pick`, `add-visualization-confirm`. The panel exposes an `add-visualization-dom-input` + `add-visualization-dom-add` pair (or Enter on the input) to register dom ids; each registered dom is rendered as its own row with `data-testid="add-visualization-dom"` + `data-dom-id="<id>"`, carrying per-row toggles `add-visualization-dom-fill-<id>` / `add-visualization-dom-stroke-<id>` and a remove button `add-visualization-dom-remove-<id>`. Per-row toggles are the source of truth for fill/stroke — there is **no global toggle**.
- `VisualizationEditButton` trigger gets `data-testid="visualization-item-edit"` and the panel mirrors the add-panel testids with an `edit-visualization-` prefix. The `IconButton` row delete control gets `data-testid="visualization-item-delete"`.
- Every interactive control above is wrapped in (or rendered alongside) `ShortcutHint` from `@kernel/modules/KeyboardShortcuts` for its bound key (CLAUDE.md rule: no shortcut without a visible hint).

### Shortcuts

Per the project-wide convention (see [KeyboardShortcuts SKILL.md → CRUD bindings](../../../../../../kernel/modules/KeyboardShortcuts/docs/skills/SKILL.md#crud-binding-convention-aed)), every list-style surface uses `a` / `e` / `d` for add / edit / delete, scoped to the list's own dedicated context. Visualizations inherit this convention.

Registered in [Composer/kernelCalls.ts](../../kernelCalls.ts) under a new dedicated `Composer/VisualizationList` context — **not** under the broader `Composer/ModelViewport` context. This is the same pattern the SVG-upload empty state uses ([SVGEmptyState context](./2026-05-10-9be5e1-svg-upload-shortcuts-mcp-tools.md)): a child context scoped to the visualization list lets us claim bare `a` / `e` / `d` without colliding with material or graduation bindings active under sibling contexts. Activation: `VisualizationListAccordion` pushes/pops `VISUALIZATION_LIST_CONTEXT_ID` via the standard `ShortcutProvider` pattern (a single provider in [VisualizationListAccordion/index.tsx](../../components/viewports/VisualizationListAccordion/index.tsx)).

| Action | Binding | Resolution |
|---|---|---|
| Expand "Visualização" accordion + focus first row | `Ctrl+Alt+V` | Opens the accordion if collapsed, focuses the first `visualization-item`. Mirrors `focusMaterialList` / `focusGraduationList`; chord lives outside the list context so it can be invoked from anywhere in the ModelViewport. |
| Focus next visualization | `ArrowDown` | `document.activeElement.closest('[data-testid="visualization-item"]')?.nextElementSibling` |
| Focus previous visualization | `ArrowUp` | `…previousElementSibling` |
| Add visualization (open panel) | `a` | Clicks the `add-visualization` trigger. Per CRUD convention. Active only under `Composer/VisualizationList`, so it does not collide with the material `a` binding under `Composer/MaterialList`. |
| Edit focused visualization | `e` | Resolved from the focused row. Per CRUD convention. |
| Delete focused visualization | `d` | Resolved from the focused row. Per CRUD convention. |
| Pick element (inside add/edit panel) | `p` | Inside the open pointer panel only — clicks `add-visualization-pick` / `edit-visualization-pick`. Registered under a child context scoped to the panel mount/unmount, so `p` does not bleed out. |

Each control must render `ShortcutHint` for its binding.

### MCP tools (paired click + shortcut)

New files under [webapp/src/system/modules/Composer/mcpTools/](../../mcpTools/), one pair per action:

| Click variant | Shortcut variant |
|---|---|
| `addVisualization.ts` | `addVisualizationShortcut.ts` |
| `editVisualization.ts` | `editVisualizationShortcut.ts` |
| `deleteVisualization.ts` | `deleteVisualizationShortcut.ts` |

Plus two focus-management tools mirroring `focusMaterialList` / `cycleMaterialFocus`:

| Tool | Purpose |
|---|---|
| `focusVisualizationList.ts` | Opens the Visualização accordion and focuses the first `visualization-item`. Single-variant. |
| `cycleVisualizationFocus.ts` | Walks `ArrowDown`/`ArrowUp` n times from the currently focused row. Errors out if no `visualization-item` is focused, mirroring [cycleMaterialFocus.ts:37](../../mcpTools/cycleMaterialFocus.ts#L37). |

All tools registered in [mcpTools/index.ts](../../mcpTools/index.ts).

Tool conventions (per [mcp-puppeteer-tools skill](../../../../../../../.claude/skills/mcp-puppeteer-tools/SKILL.md)):

- All tools first ensure the Settings panel is expanded and the "Visualização" accordion is open (reuse the same `ensureSettingsPanelExpanded` / `expandAccordion` helpers as the material/graduation tools).
- **Inputs** — `addVisualization` takes `{ name, materialNodeLabel, doms: Array<{ id, fill?, stroke? }> }`. Each `dom` entry is its own row in the form, so fill/stroke are **per element** — the same visualization can apply the material color as `fill` on one element and as `stroke` on another. Defaults per entry: `fill=true`, `stroke=false`. `materialNodeLabel` is resolved against the `add-visualization-material-select` options by visible label; the tool errors out if there is no match. `editVisualization` accepts the same `doms` shape; the full array replaces the current binding (extras are removed, missing ids are added, fill/stroke are reapplied per entry). `deleteVisualization` takes the label.
- **Click variant**: opens the panel via `add-visualization` testid, fills name, picks material from select, calls the picker bypass to inject `domIds`, toggles fill/stroke, clicks confirm. Asserts a new `visualization-item` row appears with the matching label.
- **Shortcut variant**: identical contract; `v` to open the panel, type into focused `add-visualization-name`, `Tab`+arrow keys for the select, `p` to invoke pick (bypassed), `Enter` on confirm. Drivers are co-located and do **not** cross-import from the click variant.

#### Picker bypass

`svgToolkit.pickElement` is a click-the-SVG affordance and cannot be driven by puppeteer without `page.evaluate` (forbidden in tool files). Two acceptable alternatives:

1. **Programmatic dom-id injection** — expose a panel-internal callback `addDomIds(ids: string[])` on the open Add/Edit form and bind it to a hidden `<button data-testid="add-visualization-inject-doms" data-dom-ids-json>` that reads its own JSON-encoded `data-` attribute and invokes the callback on click. The driver writes the JSON to the `data-` attribute via puppeteer's `$eval`-free path (use `ElementHandle.evaluate(node => node.setAttribute(...))` — this is per-node, not page-evaluate, so it's outside the memory rule's prohibition; if the reviewer disagrees, swap for option 2).
2. **Direct dispatch via a public store action** — extract the picker callback into a plain `addDomToVisualizationDraft({ id, fill, stroke })` thunk on the Composer hook, and have the panel reduce its `doms` state from the same source. The MCP tool then dispatches that action directly through an existing kernel-level "dispatch" surface, with no DOM round-trip. Cleaner and removes the hidden-button hack, at the cost of a small refactor of the panel's local state.

**Decision: option 2.** It avoids hidden DOM, keeps tool files free of page-evaluate-shaped escape hatches, and the refactor is self-contained (the existing local `useState<doms>` becomes a thin wrapper around a draft slice keyed by panel instance id). The picker still works for humans because it calls the same draft action under the hood.

### Puppeteer drivers (under `VisualizationListAccordion/drivers/`)

`drivers/AddVisualizationButton.click.puppeteer.ts`:
- Exports testid constants (`ADD_VISUALIZATION_TESTID`, `ADD_VISUALIZATION_NAME_TESTID`, …).
- Exports `openAddVisualizationPanel(page)`, `selectMaterialByLabel(page, label)`, `injectDomIds(page, ids, { fill, stroke })`, `confirmAddVisualization(page)`, `waitForVisualizationItem(page, label)`.

`drivers/AddVisualizationButton.shortcut.puppeteer.ts`:
- Exports `OPEN_ADD_VISUALIZATION_BINDING = 'v'`, `pressOpenAddVisualization(page)`, plus shortcut analogs for select navigation and confirm. No `page.click` to recover focus — failing loudly is the regression we want.

`drivers/VisualizationItem.click.puppeteer.ts` and `.shortcut.puppeteer.ts` mirror the same split for edit + delete.

### Tests

One file per action under [mcpTools/tests/](../../mcpTools/tests/), both variants in the same suite (per skill rule):

- `mcpTools/tests/addVisualization.e2e.test.ts`
- `mcpTools/tests/editVisualization.e2e.test.ts`
- `mcpTools/tests/deleteVisualization.e2e.test.ts`

**Standing precondition for every visualization E2E suite:** before exercising the visualization tool, the test must (a) upload an SVG via [`uploadVariationSVG`](../../mcpTools/uploadVariationSVG.ts) using the existing [`mcpTools/tests/fixtures/sample.svg`](../../mcpTools/tests/fixtures/sample.svg) fixture (whose `<rect>` / `<line>` / `<path>` / `<circle>` elements ship with stable `id` attributes), and (b) add a material via [`addMaterial`](../../mcpTools/addMaterial.ts). Visualization is meaningless without an SVG to bind into and a material to bind to, so neither precondition can be skipped or stubbed. This is enforced via a shared `tests/helpers/setupVisualizationContext.ts` that returns `{ variationId, garmentId, svgDomIds, materialNodeLabels }` and is called from every visualization suite's `beforeEach`. If the sample SVG's element ids are not yet stable, this change adds explicit `id="rect-border" | "line-x1" | "line-x2" | "path-quad" | "path-cubic" | "circle-1" | "circle-2" | "circle-3"` to the fixture as part of the work — these ids are then the addressable surface for visualizations.

Suite contents (each suite uses one workspace fixture, e.g. `e2e-visualization-add`):

- `addVisualization.e2e.test.ts`:
  - `'add visualization via click (E2E)'` — calls the click tool with `doms=[{ id: 'rect-border', fill: true, stroke: false }]`. Asserts: a new `VISUALIZATION` graph node exists with the right label/materialNodeId/doms; `visualization-item` row appears in the DOM; **and the live SVG element `#rect-border` has `fill === material.color.hex`** (read via `$eval(el => getComputedStyle(el).fill)`). This is the assertion that proves the feature works end-to-end.
  - `'add visualization via shortcut (E2E)'` — same contract through the shortcut driver. Identical color assertion. Must not import any click-variant driver.
  - `'binds two elements with different fill/stroke settings in one visualization'` — exercises the per-element toggles: `doms=[{ id: 'rect-border', fill: true, stroke: false }, { id: 'circle-1', fill: false, stroke: true }]`. Asserts `rect-border` takes the material color as `fill` and `circle-1` takes the same color as `stroke`, proving the per-row toggles actually plumb through to distinct SVG style branches.
  - `'rejects unknown materialNodeLabel'` — both variants reject before opening the panel.
  - `'rejects empty doms array'` — both variants reject; the confirm button stays disabled in the human flow, and the tool surfaces that as an error.
- `editVisualization.e2e.test.ts`:
  - `'edit visualization changes material binding (E2E)'` — adds two materials with distinct colors (red, blue), creates a visualization bound to the first (red), then edits it to bind to the second (blue). Asserts the bound element's live `fill` flips from red to blue. Both click and shortcut variants.
  - `'edit visualization toggles fill/stroke per element'` — adds a visualization with `[{ id: 'rect-border', fill: true, stroke: false }]`, then edits to `[{ id: 'rect-border', fill: false, stroke: true }]`. Asserts `fill` reverts (no proxy / inherited) and `stroke` becomes the material color. A second variant uses two doms with opposite settings to confirm the per-element distinction survives a round trip through the edit form.
  - **`'changing the bound material's color updates the SVG element (E2E)'`** — *this is the core regression test for the feature this change exists to expose*. Adds a visualization, then calls [`editMaterial`](../../mcpTools/editMaterial.ts) to change the material's color attribute. Asserts the SVG element's `fill` (or `stroke`) follows the new color hex without re-saving the visualization. Drives [`updateMaterial`'s proxy-push branch](../../hooks/useVariation.ts#L351-L386). Both variants.
- `deleteVisualization.e2e.test.ts`:
  - `'delete visualization via click/shortcut'` — adds, deletes, asserts row gone, graph node removed, and the previously bound element's `fill` no longer tracks the material color.

Skip when CDP is unreachable, matching the other Composer suites.

## Status notes

Draft. Open decisions before implementation:

- **Picker bypass approach** — leaning toward option 2 (refactor `doms` into a draft slice + dispatch a public action) over option 1 (hidden inject button). Option 1 is faster but smells; option 2 is cleaner but touches the panel's local state model. Confirm with reviewer before committing.
- **Migrating sibling lists to the convention** — `MaterialList` already uses `a` (add) and `e` (edit), so it is conformant; `GraduationList` currently uses `g` / `r` / `d` / `w` / `s` and is **not**. Migrating graduation to `a` / `e` / `d` (with reorder kept on `w` / `s`) is recommended as a follow-up but is out of scope for this change — visualization can adopt the new convention immediately because its own list context is being introduced fresh.
- **Sample SVG ids** — the fixture currently ships with primitives but the change doc above assumes stable `id`s on each one. Confirm whether [`fixtures/sample.svg`](../../mcpTools/tests/fixtures/sample.svg) already has them; if not, adding stable ids is in scope of this change because every visualization test depends on addressable elements.
- **Color read** — asserting via `getComputedStyle(el).fill` returns `rgb(...)` not `#hex`. The test helper must convert the material's hex to the `rgb(r, g, b)` form before comparing, or read the inline `style.fill` set by `svg.addProxy` directly.
- **Visualization "of" a non-existent dom id** — the picker only emits ids that exist in the loaded SVG, so the human flow is implicitly safe. The MCP tool, by contrast, can be handed any string. Decide: validate `domIds` against the live SVG element set before dispatch, or let the proxy push silently no-op? Lean toward validation and erroring out — silent no-ops are the worst kind of MCP failure mode.

No code has been written yet; this document is the implementation contract.

## Security

`domIds`, `materialNodeLabel`, and `name` are caller-supplied strings written into graph state and used as `querySelector` arguments against the loaded SVG (in tests, via `ElementHandle` resolution). Tools must:

- Treat `domIds` as identifiers, not selectors — look elements up via `[id="..."]` attribute equality, not by interpolating into a CSS selector. A malicious id like `'a"], svg [id="b'` could otherwise widen the match.
- Reject names containing characters that would break the `data-visualization-label="<label>"` attribute interpolation (quotes, angle brackets) at the tool boundary.
- Not log the resolved element list or material color in tool responses beyond what the human UI already reveals.

No new IPC surface, no new external endpoints, no secret handling. The visualization graph node and its proxy push are local-only — same trust model as the human pick-and-bind path.

## Performance

None expected. Each tool is a single user-equivalent interaction sequence reading/writing one graph node. The proxy push in `updateMaterial` is already O(visualizations × doms-per-visualization) per material edit and is not changed by this work. Test cost adds three Jest specs driving two CDP scenarios each — bounded and parallelizable with the existing material/graduation/svg-upload suites. The shared `setupVisualizationContext` helper adds an SVG upload + material add to every visualization suite's setup, which is the dominant cost; suites should reuse a single workspace fixture per file rather than per test where possible.
