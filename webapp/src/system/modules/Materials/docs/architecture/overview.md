# Materials module — architecture overview

This module owns the material catalog: the data model, its persistence, and the UI surfaces that let users inspect and edit it. The persistence model is a workspace-scoped graph stored on the workspace's Jazz node; see [graph-semantics.md](./graph-semantics.md) for node/edge details and [../jazz.md](../jazz.md) for storage layout, write paths, and multi-peer sync.

## Scope

- **Catalog data**: material records, material-type schemas (versioned), industries, sellers.
- **UI surfaces**:
  - Ribbon tab "Materiais" — `EstoqueSection` (Add Material + Open Stock viewport) and `TiposDeMateriaisSection` (list + register-new-version).
  - `MaterialStock` viewport — read-only table of stock with fuzzy search; row-level Update/Delete actions. (A quadtree view is scaffolded as a placeholder; see "Out of scope".)
  - `AddMaterialSection` mounts a schema-driven Add form in a draggable `PointerContainer`.
- **Cross-module reuse**: a graph backbone aligned with `kernel/modules/Graphs`; persisted on the workspace's Jazz node, but — unlike Composer's atomic `graphJson` — every node, edge, and attribute is its own CoValue for conflict-free parallel editing.

## Module layout

```
system/modules/Materials/
├── components/
│   ├── EstoqueSection.tsx               — ribbon section grouping Add + Open-Stock
│   ├── AddMaterialSection.tsx           — ribbon button + Add-form PointerContainer
│   ├── MaterialStockSection.tsx         — ribbon button → addViewport("Estoque")
│   ├── TiposDeMateriaisSection.tsx      — ribbon section grouping type list + register-version
│   ├── MaterialTypesSection.tsx         — list / select existing material types
│   ├── UpdateMaterialTypeSection.tsx    — register a new schema version
│   ├── selectors/                       — existing Material / MaterialType pickers
│   ├── MaterialForm/
│   │   └── SchemaDrivenFields.tsx       — recursive AttributeTypes renderer
│   └── viewports/MaterialStockViewport/
│       ├── index.tsx                    — root, view switch on extra.view
│       ├── MaterialStockToolbar.tsx     — search + view toggle
│       ├── TableView.tsx                — MUI DataGrid; row actions: Update | Delete
│       └── SummaryBar.tsx               — per-type stock totals
├── hooks/
│   ├── useFilteredMaterials.ts          — subsequence-match scorer
│   ├── useMaterials.ts                  — existing
│   └── useMaterialTypes.ts              — existing
├── store/
│   ├── materials/                       — slice, actions, middlewares (Jazz-backed)
│   ├── materialTypes/                   — slice (versioned-aware)
│   ├── industries/                      — new slice
│   ├── sellers/                         — new slice
│   └── graph/                           — adjacency derived in memory
├── main/
│   └── materials.ts                     — main-process Jazz IPC: load + mutate the catalog CoValues
├── kernelCalls.ts                       — register viewport + ribbon sections + shortcuts
└── docs/
    ├── architecture/
    │   ├── overview.md                  — this file
    │   └── graph-semantics.md
    └── jazz.md                          — storage layout, write paths, multi-peer sync
```

Not yet built (deferred — see change-doc Phase 4/5): a `QuadtreeView`, a monetary total in `SummaryBar`, a viewport-side Update form container, `useMaterialsGraph`, dedicated `selectors.ts`. The viewport's `quadtree` view renders a placeholder.

## Viewport: `MaterialStock`

`viewport.extra` shape: `{ view: "table" | "quadtree"; query: string; selectedId?: string }`. Updates dispatched through the existing viewport-extra reducer; pattern mirrors `ModelViewport` in `system/modules/Composer/components/viewports/ModelViewport`.

### Component tree

```
MaterialStockViewport                      reads viewport.extra.view
├── MaterialStockToolbar
│   ├── SearchBar                          fuzzy filter, "/" focuses
│   └── ViewModeToggle                     Table=1 | Quadtree=2 (matches Composer)
├── TableView
│   └── DataGrid (@mui/x-data-grid)        arrow-key row cycling, trailing actions column (Update + Delete)
├── SummaryBar                             grouped by material type: total amount
└── (quadtree view: placeholder)
```

There is no toolbar Update/Delete control — those live as per-row icons in the table's trailing actions column. The Add form is mounted from the ribbon `AddMaterialSection`, never from the viewport.

### Table behavior

- Renders `@mui/x-data-grid`'s `DataGrid` directly — no `CRUDGrid` wrapper.
- Columns: id, type, principal (resolved `attributes.nome` / `categoria`), extra (chips of remaining attributes), origin (industry + suppliers), stock amount, stock unit, **actions** (last).
- The trailing `actions` column holds two `GridActionsCellItem`s per row: **Update** (opens the Update form) and **Delete** (confirms then dispatches `deleteMaterial`).
- Grid is read-only: no inline cell editing. All edits — stock included — route through the row's Update action.
- Arrow keys (`↑`/`↓`) cycle the selected row, wrapping bottom↔top; the first row is selected on mount and on filter change. Selecting a row sets `viewport.extra.selectedId`.
- `Enter` on the selected row triggers its Update action; `Esc` clears the selection.

### Summary bar

Sits below the grid. For each material-type group within the current filter, renders the **total stock amount** (unit-aware). A monetary total (`Σ stock.amount × latestPrice`) is parked until per-material pricing lands.

### Quadtree view

Placeholder ("Quadtree em breve"). The full d3 squarified-treemap implementation is parked in change-doc Phase 4. The view toggle is wired so the eventual implementation drops in without touching the viewport contract.

### Fuzzy search

Lightweight in-house subsequence-match scorer in `hooks/useFilteredMaterials.ts`. Search keys per material: `attributes.nome`, type label, edge-resolved industry name, color label, `externalId`. No external dep.

## Entry points (ribbon "Materiais" tab)

Registered in `kernelCalls.ts`. The shipped UI groups Add + Open Stock into a single section ("Estoque") and the type-list + register-version pair into another section ("Tipos de Materiais"):

| Section | Buttons | Behavior |
|---|---|---|
| `EstoqueSection` | "Adicionar material" (via `AddMaterialSection`), "Estoque de materiais" (via `MaterialStockSection`) | Add dispatches a `pushContainer({ id: "materials/addMaterial", … })`. Estoque calls `viewportManager.functions.addViewport("Estoque", "MaterialStock", { view: "table", query: "" }, "materialstock-")`. |
| `TiposDeMateriaisSection` | `MaterialTypesSection` (existing list) and `UpdateMaterialTypeSection` (register-version) | Registering a new version dispatches `registerMaterialTypeVersion({ name, version, schemaJson, predecessorId? })`. |

There is currently **no viewport-side Add affordance** — Add lives only on the ribbon.

## Forms — Create / Update

Add is a schema-driven form hosted in a draggable [PointerContainer](../../../../kernel/modules/Pointer/components/PointerContainer.tsx) mounted from `AddMaterialSection`. The viewport's row Update action triggers `onUpdate(id)`; wiring it to a `PointerContainer` (Update form) is open work — until then the row Update is the only update entry point.

### Mounting

- **Add**: ribbon "Adicionar material" button mounts a `PointerContainer` inline from `AddMaterialSection`. Submit dispatches `addMaterial(...)`; the container closes on success.
- **Update (row action)**: `TableView`'s row Update icon calls `onUpdate(id)`. The viewport currently logs the request (`MaterialStockViewport/index.tsx`); routing it through a `PointerContainer` is queued.
- **Delete (row action)**: `TableView`'s row Delete icon confirms then dispatches `deleteMaterial({ id })`.

### Field structure (Add form)

| Section | Fields | Notes |
|---|---|---|
| **Identity** | `id`, `type`, `name` | `id` is a user-supplied slug, unique per workspace. Switching `type` rebuilds the schema-driven block from the new type's latest schema. `name` persists to `attributes.nome`. |
| **Common** | `stock` ({amount, unit}), `industry`, `suppliers` | Today these are plain text inputs; references to existing `OrgNodeCoMap`s are auto-created server-side when the id doesn't exist. A typed OrgNode picker is queued as a follow-up. |
| **Schema-driven** | from `MaterialType.schemas[latest].attributes` | Each key renders an input typed by its declared `AttributeTypes`. Object attributes recurse. Unknown/missing keys tolerated. |

`SchemaDrivenFields.tsx` switches on `AttributeTypes` from `store/materialTypes/state.ts:1`:
- `string` → MUI `TextField`
- `number` → numeric input (with unit selector when the shape is a `UnitValue`)
- `color` → ColorPicker reusing `components/ColorItem.tsx`
- `date` → MUI `DatePicker`
- `object` → nested fieldset (recurses)

### Submit

- **Add**: validate → dispatch `addMaterial({ material, industryId, sellerIds, typeVersion: latestSchema })` → middleware awaits the Jazz IPC, then dispatches `materialAdded` with the server-confirmed DTO → row appears in the grid.
- **Update (planned via PointerContainer)**: diff form vs loaded material → dispatch `updateMaterial({ id, patch, industryId?, sellerIds? })` (or `updateMaterialStock` when only `stock` changed) → on event, container closes; grid + summary refresh.
- **Delete**: row action → confirm → dispatch `deleteMaterial({ id })` → on event, the row leaves the grid.
- `Esc` cancels via the container's `close` handler.

## Redux surface

Actions in `store/materials/actions.ts` (commands + matching events):

- `addMaterial({ material, industryId, sellerIds, typeVersion })` / `materialAdded`
- `updateMaterial({ id, patch, industryId?, sellerIds? })` / `materialUpdated`
- `updateMaterialStock({ id, stock })` / `materialStockUpdated`
- `deleteMaterial({ id })` / `materialDeleted`
- `registerMaterialTypeVersion({ name, version, schemaJson, predecessorId? })` / `materialTypeVersionRegistered`
- `loadMaterialsCatalog()` / `materialsCatalogLoaded` — catalog refetch (also triggered on `workspaceSelected` and on the system-tray Refresh button via a kernel-Store action).

`store/materials/slice.ts` has `extraReducers` for the events plus the workspace-rehydration action (`defineRehydration("materials/rehydrated", loadFromWorkspace)`).

A dedicated `store/materials/selectors.ts` (`getFilteredMaterials(query)`, `getIndustryFor(...)`, …) is queued — until then `useFilteredMaterials` reads the slice directly.

## Persistence

The catalog is persisted on the **workspace's Jazz node** — the per-workspace, SQLite-backed CoValue store introduced for Composer's models (`kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md`). There is no `graph.json` and no per-node files on disk.

See [graph-semantics.md](./graph-semantics.md) for the full storage model and [../jazz.md](../jazz.md) for write paths and sync. In short: `WorkspaceCoMap` gains a `materials` ref to a `MaterialCatalogCoMap`. Unlike Composer's models — which pack a whole graph into one atomic `graphJson` — **every material node, edge, and attribute is its own CoValue**, so concurrent edits from different peers merge as CRDTs with no edit lease. The catalog holds `co.record`s of `MaterialCoMap` / `MaterialTypeCoMap` / `OrgNodeCoMap` / `EdgeCoMap`; adjacency is derived in memory, never persisted. All writes go through the main-process Jazz IPC surface (`window.electron.jazz.*`, extended in `main/materials.ts`) — not file I/O. Workspace switching re-resolves the new workspace's Jazz node; the slice rehydrates from CoValue state via the existing rehydrator registry.

The catalog does **not** auto-seed from hard-coded fixtures: it starts empty and is populated either by user edits or by importing the bundled `public/materials/materials.xlsx` fixture via the import UI.

## Keyboard shortcuts

Each registered via `keyboardManager.functions.registerShortcuts` AND wrapped in `ShortcutHint` (per top-level `CLAUDE.md`).

| Key | Action | `shortcutId` |
|---|---|---|
| `1` | Table view | `Materials/MaterialStockViewport/viewAsTable` |
| `2` | Quadtree view (placeholder) | `Materials/MaterialStockViewport/viewAsQuadtree` |
| `/` | Focus search | `Materials/MaterialStockViewport/focusSearch` |
| `q` | Open Add form (anchored to ribbon button) | `Materials/Estoque/addMaterial` |
| `w` | Open Stock viewport | `Materials/Estoque/openStock` |
| `e` | Focus material-types section | `Materials/TiposDeMateriais/addType` |
| `r` | Register new schema version | `Materials/TiposDeMateriais/updateType` |
| `Esc` | Close form / blur search / clear selection | (form-scoped) |

Arrow keys inside the grid cycle the selected row, wrapping top↔bottom (TableView-local, no global shortcut). `Enter` on the selected row triggers its Update action.

## Reused / extracted components

- **Reused**: `@mui/x-data-grid` (`DataGrid`, used directly), `kernel/modules/Pointer/components/PointerContainer.tsx`, `kernel/modules/Pointer/pointerContainerRegistry.ts`, `kernel/modules/Graphs/interfaces/{Node,Edge}.ts`, the `kernel/modules/Store` Jazz layer (CoSchema in `schema.ts`, the `window.electron.jazz.*` IPC surface, `defineRehydration`), `kernel/modules/KeyboardShortcuts/components/ShortcutHint`, `components/selectors/MaterialType.tsx`, `components/ColorItem.tsx`.
- **Deferred extraction**: `kernel/modules/Layout/components/SplitButtonMenu/` was discussed but ultimately not needed — row-level icons replace the split button.

## Verification

1. Boot dev (`unset ELECTRON_RUN_AS_NODE` first). Open the Materials ribbon → click "Estoque de materiais" (or press `w`) → new tab opens in Table mode.
2. **Cold start**: a fresh workspace's catalog is empty until the user imports `public/materials/materials.xlsx` (or adds materials manually).
3. **Search**: typing filters the table.
4. **Table behavior**: the first row is selected on mount; arrow keys cycle and wrap the selection across rows; the trailing actions column shows Update + Delete icons; `Enter` (or clicking the Update icon) opens the Update form for the selected material. The grid has no inline editing.
5. **Summary bar**: shows per-type stock totals for the current filter.
6. **Add**: ribbon "Adicionar material" (or `q`) opens the Add form anchored to the button. Form shows Identity → Common → Schema-driven blocks; switching `type` swaps the schema-driven block. Submit dispatches `addMaterial`, which on success creates a `MaterialCoMap` plus the `conformsTo` / `manufacturedBy` / `suppliedBy` edges and the new row appears in the grid.
7. **Delete (row action)**: confirm prompt → dispatches `deleteMaterial`, which deletes the material's `MaterialCoMap` and every incident `EdgeCoMap`.
8. **Type-version register**: open Tipos de Materiais (or `e`/`r`) → fill name + version + schema → submit dispatches `registerMaterialTypeVersion`; refuses overwrite of an existing `<name>@<version>` and adds a `succeedsVersion` edge when a predecessor exists.
9. **Workspace switch**: change workspace via the Store module → the Materials middleware refetches the catalog via `loadMaterialsCatalog` and the grid reflects the new dataset without page reload.
10. **Refresh from peers**: the system-tray PeersIndicator's Refresh button dispatches a kernel Store action that the Materials middleware listens on to re-pull from Jazz.
11. **Shortcuts**: every registered shortcut has a visible `ShortcutHint`; `1`/`2` switch views.
12. **Unit tests**: `useFilteredMaterials` scoring; reducer cases for the five events; SummaryBar aggregation; catalog round-trip (add → load → equality).
13. **e2e**: `MaterialStockViewport.e2e.test.ts` + click/shortcut puppeteer drivers per `webapp/src/docs/quality/e2e-tests.md`. `data-testid` on toolbar inputs and row actions. **Never** use inline `page.evaluate` callbacks in MCP tools.

## Out of scope / open

- Viewport-side Update form (`PointerContainer` mounted from the row Update action) — actions wire up to a `console.debug` stub today.
- Typed OrgNode picker for industry / suppliers (autocomplete with create-on-submit). Until then plain text inputs round-trip ids; the main process auto-creates referenced industries/sellers.
- `QuadtreeView` (d3 treemap) + zero-stock count badge.
- Monetary totals in `SummaryBar` (`Σ stock.amount × latestPrice`).
- `migrationOf` lineage between material instances when migrating to a newer schema version.
- Bulk import via CSV / catalog-as-graph viewport.
