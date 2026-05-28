---
id: 2026-05-20-4267a5
name: Materials catalog — Jazz-backed graph + stock viewport
description: Build the MaterialStock viewport, schema-driven Add/Update forms, and persist the catalog as a per-CoValue graph on the workspace's Jazz node.
status: in-progress
modules: [Materials, Store]
---

## Context

The Materials module today is only store slices (`materials`, `materialTypes`) and ribbon stubs — no viewport, no forms, no persistence. The target architecture is specified in [`docs/architecture/overview.md`](../architecture/overview.md) and [`docs/architecture/graph-semantics.md`](../architecture/graph-semantics.md): a workspace-scoped graph (materials, types, industries, sellers as nodes; `conformsTo` / `manufacturedBy` / `suppliedBy` / `succeedsVersion` as edges) with two UI surfaces — a `MaterialStock` viewport and a schema-driven create/update form.

Two decisions shape this change:

- **MUI `DataGrid` directly**, not the `CRUDGrid` wrapper. The table is read-only with arrow-key row cycling and a trailing actions column whose only action opens the Update form. No inline cell editing.
- **Per-CoValue Jazz storage.** Every node, edge, and *attribute* is its own CoValue (`co.record`s of CoMaps). This deliberately diverges from Composer's atomic `graphJson` + `EditLease` model: the catalog is long-lived shared state with small, frequent, multi-user edits, so per-CoValue CRDTs let concurrent attribute edits merge with no lock. See [graph-semantics.md → Why per-CoValue](../architecture/graph-semantics.md).

## Change

What this change builds in the Materials module:

- **`components/viewports/MaterialStockViewport/`** — `index.tsx` (view switch on `viewport.extra.view`), `MaterialStockToolbar.tsx` (fuzzy search, `MaterialCRUDSplitButton`, table/quadtree toggle), `TableView.tsx` (MUI `DataGrid`, arrow-key row cycling with top↔bottom wrap, trailing `type: "actions"` Update column), `SummaryBar.tsx` (per-type stock + monetary totals), `QuadtreeView.tsx` (d3 squarified treemap).
- **`components/MaterialForm/`** — `MaterialFormContainer.tsx` (Add | Update modes in a draggable `PointerContainer`), `MaterialFormFields.tsx` (Identity + Common sections), `SchemaDrivenFields.tsx` (recursive `AttributeTypes` renderer), `useMaterialForm.ts`.
- **`components/AddMaterialSection.tsx` / `MaterialStockSection.tsx`** — ribbon entry points.
- **`store/`** — `materials/` slice with 5 command/event pairs (`addMaterial`/`materialAdded`, `updateMaterial`/`materialUpdated`, `updateMaterialStock`/`materialStockUpdated`, `deleteMaterial`/`materialDeleted`, `registerMaterialTypeVersion`/`materialTypeVersionRegistered`), `extraReducers`, the `materials/rehydrated` rehydrator, and selectors; new `industries/`, `sellers/`, `graph/` slices.
- **`main/materials.ts`** — main-process Jazz IPC handlers that read/write the catalog CoValues; cold-start seeding from the existing hard-coded fixtures.
- **`hooks/`** — `useFilteredMaterials.ts` (subsequence-match scorer), `useMaterialsGraph.ts`.
- **`kernelCalls.ts`** — register the viewport, ribbon sections, and `1`/`2`/`/`/`N` shortcuts (each paired with a `ShortcutHint` per repo `CLAUDE.md`).

One-time extraction: `kernel/modules/Layout/components/SplitButtonMenu/` pulled out of `Orders/components/BudgetFloatingButton`.

The Store-side CoSchema additions are tracked in the paired [Store change doc](../../../../kernel/modules/Store/docs/changes/2026-05-20-4267a5-materials-catalog-jazz.md).

## Roadmap

**Phase 1 — Persistence foundation (Store + main process).**
CoSchema in `Store/schema.ts` (`AttributeCoMap`, `StockCoMap`, `MaterialCoMap`, `MaterialTypeCoMap`, `OrgNodeCoMap`, `EdgeCoMap`, `MaterialCatalogCoMap`; `WorkspaceCoMap.materials` optional). `main/materials.ts` IPC handlers + preload bindings (`window.electron.jazz.materials.*`). Cold-start seeding from fixtures. Materials/graph/industries/sellers slices, actions/events, `defineRehydration`. Gate: add → reload → equality round-trip test.

**Phase 2 — Stock viewport, table view.**
`MaterialStockViewport` root + `MaterialStockToolbar` + `TableView` (MUI `DataGrid`, row cycling, Update actions column) + `SummaryBar`. `MaterialStockSection` ribbon button → `addViewport`. `useFilteredMaterials` fuzzy search. Shortcuts `1`/`2`/`/` with hints. Gate: table renders seeded fixtures, search filters, row selection syncs `selectedId`.

**Phase 3 — Schema-driven Add/Update forms.**
`SplitButtonMenu` extraction. `MaterialFormContainer` + `MaterialFormFields` + `SchemaDrivenFields` + `useMaterialForm`. `AddMaterialSection` ribbon button + `N` shortcut. Industry/seller autocomplete with create-on-submit. Submit wires `addMaterial` / `updateMaterial` / `updateMaterialStock`. Type-change re-pins `conformsTo`. Gate: full add/update/delete cycle persists and survives reload.

**Phase 4 — Quadtree, summary, e2e.**
`QuadtreeView` d3 treemap with `ResizeObserver` + zero-stock count badge. `SummaryBar` monetary totals. `MaterialStockViewport.e2e.test.ts` + click/shortcut puppeteer drivers; `data-testid`s on toolbar inputs, form fields, treemap `<rect>`s. Gate: e2e green, all shortcuts have visible hints.

**Phase 5 — Deferred (not in this change).**
`migrationOf` lineage between material instances; bulk / CSV import; catalog-as-graph viewport; group-by-type treemap tiling. A denormalized summary record (à la `ModelSummary`) if catalog load cost becomes a problem.

## Status notes

In-progress. Phases 1, 2, and most of 3 landed (2026-05-24):

- **Phase 1 (persistence foundation).** CoSchema added to `kernel/modules/Store/schema.ts`; main-process Jazz handlers at `system/modules/Materials/main/materials.ts` with IPC wiring through `electron/main/jazz-hooks.ts` and `electron/preload/jazz.ts`; new `industries` / `sellers` / `graph` slices plus the five command/event pairs on `store/materials`. The renderer no longer seeds from a hard-coded fixture; the catalog starts empty and the user imports `public/materials/materials.xlsx` (importer dispatches the same actions a user would).
- **Phase 2 (table view).** `MaterialStockViewport` (toolbar + read-only `DataGrid` + `SummaryBar`), `MaterialStockSection` / `EstoqueSection` ribbon buttons, and `1` / `2` / `/` shortcuts (each paired with a `ShortcutHint`). Ribbon sections shipped grouped as `EstoqueSection` (Add + Open Stock) and `TiposDeMateriaisSection` (list + register-version) rather than the four separate sections the early overview described.
- **Phase 3 (forms + collaborative drivers).** Add-from-ribbon `PointerContainer` lives in `AddMaterialSection.tsx`; `SchemaDrivenFields.tsx` renders the schema-driven block recursively; type-version registration shipped via `UpdateMaterialTypeSection.tsx`. Collaborative e2e drivers under `components/drivers/` and `tests/collaborative/functionality/` exercise the multi-peer write paths. Row Update + Delete actions live in `TableView`'s trailing actions column; clicking Update currently surfaces a `console.debug` hook (a `PointerContainer`-mounted Update form is the remaining Phase 3 work). Ribbon shortcuts shipped as `q` (Add), `w` (Open Stock), `e` (Tipos list), `r` (Register version) instead of the proposed `N`.
- **Phase 4 (quadtree, monetary totals, e2e expansion).** Still open; the viewport renders a "Quadtree em breve" placeholder.

Remaining work in scope of this change:

- Mount a `PointerContainer`-hosted Update form from the row Update action (today only the `console.debug` hook).
- Replace the wholesale `attributes` record rewrite in `main/materials.ts updateMaterial` with per-cell `AttributeCoMap` diffing so concurrent attribute edits actually merge (the per-CoValue advertised behaviour).
- Typed `OrgNodeCoMap` picker for industry / suppliers (autocomplete with create-on-submit). Today the form posts raw strings and the main process auto-creates the referenced OrgNode.
- `QuadtreeView` + zero-stock count badge; monetary totals in `SummaryBar`.

Open decisions before later phases:

- **Collaborative safety.** Per-CoValue editing removes the clobbering hazard, but multi-peer sync still has no receive-validator (foundation-doc Phase 6). Catalogs must not enable `syncOptIn` until that lands.
- **Catalog load cost.** `loadMaterials` walks every node + edge record on workspace open. Acceptable for now; revisit with a summary projection if it regresses.
- **`object`-attribute recursion depth.** `AttributeCoMap.children` recurses arbitrarily; confirm `SchemaDrivenFields` and the seeding code bound it to the schema's actual nesting.

## Security

- Catalog CoValues are created under the workspace's existing Jazz group, so access control matches `ModelCoMap` — same group, same readers/writers. Per-CoValue granularity adds many CoValues but no new trust boundary.
- **No receive-validator yet.** Once `syncOptIn` is enabled, any peer with write access could inject mutations into catalog CoValues; this is foundation-doc Phase 6 work. Do not enable sync on a catalog-bearing workspace before then.
- New IPC surface (`window.electron.jazz.materials.*`) runs in the main process; input shape is validated by TypeScript only — no payload-size cap. Add a cap alongside the plan's `jazz-mutate` hardening.
- Material attributes are user-supplied free-form values rendered by `SchemaDrivenFields`; validate types on submit and treat any string attribute as untrusted when displayed.
- No new credential storage or secrets handling.

## Performance

- **Diverges from `jazz-performance.md`.** Per-node / per-attribute CoValues trade more CoValues and more per-cell CRDT history for conflict-free parallel editing. The cost is bounded by the explicit-save UX (no keystroke autosave, no debounced writes).
- `loadMaterials` is O(nodes + edges) per workspace open; `adjacencyList` is derived in memory, never persisted. Below the plan's catalog-size budget this is fine; a denormalized summary record is the escape hatch (Phase 5).
- A single edit touches only the cells it changes (`updateMaterialStock` writes one `StockCoMap`; one attribute edit writes one `AttributeCoMap`) — no read-modify-write of a shared blob.
- The grid reads from Redux state, not Jazz directly, so render cost is unaffected by storage granularity.
- No benchmarks run yet; add a seeded-catalog load benchmark in Phase 4.
