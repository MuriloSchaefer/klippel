# Materials module — architecture overview

This module owns the material catalog: the data model, its persistence, and the UI surfaces that let users inspect and edit it. The persistence model is a workspace-scoped graph; see [graph-semantics.md](./graph-semantics.md) for node/edge details.

## Scope

- **Catalog data**: material records, material-type schemas (versioned), industries, sellers.
- **UI surfaces**:
  - Ribbon tab "Materiais" — entry points (Add Material, Open Stock Viewport, existing material-types section).
  - `MaterialStock` viewport — table + quadtree visualization of stock, fuzzy search, inline stock edits.
  - `MaterialFormContainer` — schema-driven create/update form hosted in a draggable `PointerContainer`.
- **Cross-module reuse**: a graph backbone aligned with `kernel/modules/Graphs` and Composer's `graph.json` pattern.

## Module layout

```
system/modules/Materials/
├── components/
│   ├── AddMaterialSection.tsx           — ribbon section, Add Material button
│   ├── MaterialStockSection.tsx         — ribbon section, Open Stock Viewport button
│   ├── MaterialTypesSection.tsx         — existing
│   ├── selectors/                       — existing Material/MaterialType pickers
│   ├── MaterialForm/
│   │   ├── MaterialFormContainer.tsx    — PointerContainer wrapper (Add | Update mode)
│   │   ├── MaterialFormFields.tsx       — Identity + Common sections
│   │   ├── SchemaDrivenFields.tsx       — recursive schema renderer
│   │   └── useMaterialForm.ts           — form state hook
│   └── viewports/MaterialStockViewport/
│       ├── index.tsx                    — root, view switch on extra.view
│       ├── MaterialStockToolbar.tsx     — search + split-button + view toggle
│       ├── TableView.tsx                — CRUDGrid wrapper
│       ├── SummaryBar.tsx               — per-type stock + monetary totals
│       └── QuadtreeView.tsx             — d3 squarified treemap
├── hooks/
│   ├── useFilteredMaterials.ts          — subsequence-match scorer
│   ├── useMaterialsGraph.ts             — edge-resolving selector wrapper
│   ├── useMaterials.ts                  — existing
│   └── useMaterialTypes.ts              — existing
├── store/
│   ├── materials/                       — slice, actions, selectors, middlewares (graph-backed)
│   ├── materialTypes/                   — slice (now versioned-aware)
│   ├── industries/                      — new slice
│   ├── sellers/                         — new slice
│   └── graph/                           — slice holding the materials graph (nodes/edges/adjacency)
├── kernelCalls.ts                       — register viewport + ribbon sections + shortcuts
└── docs/architecture/
    ├── overview.md                      — this file
    └── graph-semantics.md
```

## Viewport: `MaterialStock`

`viewport.extra` shape: `{ view: "table" | "quadtree"; query: string; selectedId?: string }`. Updates dispatched through the existing viewport-extra reducer; pattern mirrors `ModelViewport` in `system/modules/Composer/components/viewports/ModelViewport`.

### Component tree

```
MaterialStockViewport                      reads viewport.extra.view
├── MaterialStockToolbar
│   ├── SearchBar                          fuzzy filter, "/" focuses
│   ├── MaterialCRUDSplitButton            default: Update | menu: Delete; disabled when selectedId is null
│   └── ViewModeToggle                     Table=1 | Quadtree=2 (matches Composer)
├── TableView
│   ├── CRUDGrid                           auto-focus first cell, arrow-key cycling, inline stock cell
│   └── SummaryBar                         grouped by material type: total amount + monetary value
└── QuadtreeView                           d3 squarified treemap, click selects
```

`MaterialFormContainer` is mounted from outside the viewport tree — from the ribbon Add button or the viewport split-button's Update action.

### Table behavior

- Wraps `kernel/modules/Layout/components/CRUDGrid/CRUDGrid.tsx`.
- Columns: id, type, name, supplier, **stock.amount** (editable), unit, price.
- Auto-focus first editable cell on mount and on filter change.
- Arrow keys cycle focus across editable cells (wraps row→row); `Enter` commits + moves down; `Esc` cancels.
- Inline stock edit → `updateMaterialStock` (narrow write, no graph touch). Row delete → `deleteMaterial`.
- Full edits route through Update PointerContainer, not the grid.

### Summary bar

Sits below the grid. For each material-type group within the current filter, renders **total stock amount** (unit-aware) and **monetary value** (`Σ stock.amount × latestPrice`). Grand total on the right. Driven by `useMaterialTypes()` for labels.

### Quadtree view

`d3.hierarchy({ children: filtered }).sum(m => Math.max(m.stock.amount, 0.0001))` + `d3.treemap().tile(d3.treemapSquarify).padding(2)`. SVG of `<rect>` + `<text>`; color from `attributes.cor.hex`; click sets `selectedId`; `ResizeObserver` relayouts on viewport resize. Zero-stock materials are hidden by default; a count badge in the toolbar reports how many were filtered out.

### Fuzzy search

Lightweight in-house subsequence-match scorer in `hooks/useFilteredMaterials.ts`. Search keys per material: `attributes.nome`, type label, edge-resolved industry name, color label, `externalId`. No external dep.

## Entry points (ribbon "Materiais" tab)

Registered in `kernelCalls.ts` alongside existing `MaterialTypeSection`:

| Section | Button | Behavior |
|---|---|---|
| `AddMaterialSection` | "Adicionar material" | Dispatches `pushContainer({ id: "materials/addMaterial", anchor: <button rect> })`. **The only Add entry point in the UI.** |
| `MaterialStockSection` | "Estoque de materiais" | Calls `viewportManager.functions.addViewport("Estoque", "MaterialStock", { view: "table", query: "" }, "materialstock-")`. |
| `MaterialTypeSection` | existing | Unchanged. |

## Forms — Create / Update

Add and Update share a single schema-driven form hosted in a draggable [PointerContainer](../../../../kernel/modules/Pointer/components/PointerContainer.tsx) (focus mgmt, confirm/close handlers, draggable header, keyboard contexts). No popper / popover.

### Mounting

- **Add**: ribbon "Adicionar material" button dispatches `pushContainer({ id: "materials/addMaterial", anchor: <button rect> })`.
- **Update**: viewport's floating split-button (default action: Update; menu: Delete; both disabled while `selectedId` is null) dispatches `pushContainer({ id: "materials/updateMaterial", anchor: <split-button rect>, payload: { materialId: selectedId } })`.
- Both register `ContainerHandlers` (`close`, `confirm`) via `pointerContainerRegistry` so `Enter`/`Esc` wire up automatically.

### Field structure

| Section | Fields | Notes |
|---|---|---|
| **Identity** | `id`, `type`, `name` | `id` is a user-supplied slug (Composer Model pattern), unique per workspace, **locked in update mode**. Changing `type` in add-mode rebuilds the schema-driven block from the new type's `latestSchema`; in update-mode it prompts a confirm (re-pins `conformsTo`). `name` persists to `attributes.nome`. |
| **Common** | `stock` ({amount, unit}), `industry`, `suppliers` | Industry: single-select autocomplete over existing `industry` nodes; free-text creates a new node. Suppliers: multi-select over `seller` nodes; same create-on-submit. |
| **Schema-driven** | from `MaterialType.schemas[<chosenVersion>].attributes` | Add: `chosenVersion = latestSchema`. Update: pinned `schemaVersion` (from the `conformsTo` edge) unless the user explicitly migrates. Every key renders an input typed by its declared `AttributeTypes`. Object attributes recurse. Unknown/missing keys are tolerated. |

`SchemaDrivenFields.tsx` switches on `AttributeTypes` from `store/materialTypes/state.ts:1`:
- `string` → MUI `TextField`
- `number` → numeric input (with unit selector when the shape is a `UnitValue`)
- `color` → ColorPicker reusing `components/ColorItem.tsx`
- `date` → MUI `DatePicker`
- `object` → nested fieldset (recurses)

### Submit

- **Add**: validate → dispatch `addMaterial({ material, industryId, sellerIds, typeVersion: latestSchema })` → middleware persists payload + graph → on `materialAdded`, container closes and the new row appears in the grid.
- **Update**: diff form vs loaded material → dispatch `updateMaterial({ id, patch, industryId?, sellerIds? })` (or `updateMaterialStock` when only `stock` changed) → on event, container closes; grid + summary refresh.
- `Esc` cancels via the container's `close` handler.

## Redux surface

New actions in `store/materials/actions.ts` (commands + matching events):

- `addMaterial({ material, industryId, sellerIds, typeVersion })` / `materialAdded`
- `updateMaterial({ id, patch, industryId?, sellerIds? })` / `materialUpdated`
- `updateMaterialStock({ id, stock })` / `materialStockUpdated`
- `deleteMaterial({ id })` / `materialDeleted`
- `registerMaterialTypeVersion({ name, schema })` / `materialTypeVersionRegistered`

`store/materials/slice.ts` adds `extraReducers` for the five events plus the workspace-rehydration action (`defineRehydration("materials/rehydrated", loadFromWorkspace)`).

Selector additions in `store/materials/selectors.ts`: `getFilteredMaterials(query)` (memoized), `getIndustryFor(materialId)`, `getSellersFor(materialId)`, `getSchemaVersionFor(materialId)`.

## Persistence

See [graph-semantics.md](./graph-semantics.md) for the full storage model. In short: per-node payload files on disk plus a single `materials/graph.json` for edges/adjacency, all written through `workspaceStorage` from `kernel/modules/Store/workspaceScope.ts`. Workspace switching re-reads the new workspace's files via the existing rehydrator registry.

## Keyboard shortcuts

Each registered via `keyboardManager.functions.registerShortcuts` AND wrapped in `ShortcutHint` (per top-level `CLAUDE.md`). Mirrors Composer's pattern at `system/modules/Composer/kernelCalls.ts:124-140`:

| Key | Action | `shortcutId` |
|---|---|---|
| `1` | Table view | `Materials/MaterialStockViewport/viewAsTable` |
| `2` | Quadtree view | `Materials/MaterialStockViewport/viewAsQuadtree` |
| `/` | Focus search | `Materials/MaterialStockViewport/focusSearch` |
| `N` | Open Add form (anchored to ribbon button) | `Materials/AddMaterial/open` |
| `Esc` | Close form / blur search / clear selection | (form-scoped) |

Arrow keys inside the grid cycle editable cells (TableView-local, no global shortcut). The split-button's default action triggers on `Enter` once enabled.

## Reused / extracted components

- **Reused**: `kernel/modules/Layout/components/CRUDGrid/CRUDGrid.tsx`, `kernel/modules/Pointer/components/PointerContainer.tsx`, `kernel/modules/Pointer/pointerContainerRegistry.ts`, `kernel/modules/Graphs/interfaces/{Node,Edge}.ts`, `kernel/modules/Store/workspaceScope.ts`, `kernel/modules/KeyboardShortcuts/components/ShortcutHint`, `components/selectors/MaterialType.tsx`, `components/ColorItem.tsx`.
- **Extracted (one-time)**: `kernel/modules/Layout/components/SplitButtonMenu/index.tsx` — pulled out of the inline pattern at `system/modules/Orders/components/BudgetFloatingButton/index.tsx:133`. Props: `actions: {id,label,onClick,color?}[]`, `defaultId`, `disabled?`. `BudgetFloatingButton` is refactored to consume it.

## Verification

1. Boot dev (`unset ELECTRON_RUN_AS_NODE` first). Open the Materials ribbon → click "Estoque de materiais" → new tab opens in Table mode.
2. **Cold start**: in a fresh workspace, the bootstrap writes `materials/graph.json`, per-material payload files under `materials/<type>/<id>.json`, and `material-types/<name>/<version>.json` from the current fixtures. Inspect the workspace folder to confirm.
3. **Search**: typing filters both views; toggle to Quadtree (`2`) to confirm parity.
4. **Table behavior**: first editable cell auto-focuses; arrow keys cycle and wrap across rows; `Enter` commits a stock edit which dispatches `updateMaterialStock`, rewrites only that payload file, and survives a reload.
5. **Summary bar**: changing a stock value updates per-type group total and grand total live; monetary value reflects each material's latest price.
6. **Add**: ribbon "Adicionar material" (or `N`) opens `MaterialFormContainer` anchored to the button. Form shows Identity → Common → Schema-driven blocks; switching `type` swaps the schema-driven block. Submit dispatches `addMaterial`, writes payload file + updates `materials/graph.json` (new node + `conformsTo` / `manufacturedBy` / `suppliedBy` edges), and the new row appears in the grid. The viewport itself has NO Add affordance.
7. **Update/Delete**: split-button is disabled on load; clicking a row enables it. Default action opens the form in Update mode pre-filled from the material's pinned schema version. Delete prompts then dispatches `deleteMaterial`, removes the payload file, and prunes node + edges.
8. **Type change in Update**: edit `type` → on save, JSON moves from `materials/<oldType>/<id>.json` to `materials/<newType>/<id>.json`, the graph node's `type` rewrites, and `conformsTo` re-points at the new type's `latestSchema`.
9. **Workspace switch**: change workspace via the Store module → rehydrator re-reads from the new workspace → grid reflects the new dataset without page reload.
10. **Quadtree**: with stock 10 vs 40, rect areas ~1:4; click selects; window resize re-tiles.
11. **Shortcuts**: every registered shortcut has a visible `ShortcutHint`; `1`/`2` switch views, matching Composer.
12. **Unit tests**: `useFilteredMaterials` scoring; reducer cases for the 5 new events; SummaryBar aggregation; graph round-trip (add → load → equality).
13. **e2e**: `MaterialStockViewport.e2e.test.ts` + click/shortcut puppeteer drivers per `webapp/src/docs/quality/e2e-tests.md`. `data-testid` on toolbar inputs, form fields, and treemap `<rect>`s. **Never** use inline `page.evaluate` callbacks in MCP tools.

## Out of scope / open

- `migrationOf` lineage between material instances when migrating to a newer schema version. Banner is shown but the action is deferred.
- Group-by-type tiling of the treemap (could be a later toolbar dropdown).
- Bulk import / CSV.
- Catalog-as-graph viewport (visualizing materials/industries/sellers/types in a 2D graph) — enabled by this design but not built now.
