---
id: 2026-08-02-e9465a
name: Material consumption unit
description: Material type schemas gain an optional `consumptionUnit` that becomes the target unit for usage/cost math, falling back to the stock unit when unset.
status: implemented
modules: [Materials, Composer]
---

## Context

Today the target unit for every material usage calculation is hard-wired to
`material.stock.unit` (see `Composer/utils/computeMaterialCost.ts:55-61`). Stock
is measured in whatever unit the material is *bought/stored* in (kg for a roll of
malha), but consumption is naturally expressed in a different unit (metres of
fabric per garment). Forcing the aggregation into the stock unit means every
`CONSUMES` edge has to convert into kg even when the user thinks in metres, and
the audit panel reports numbers the user then has to re-convert mentally.

The request: let the user declare a **consumption unit** and use that as the
conversion target when computing usage per unit. When it is not defined,
behaviour is unchanged — the stock unit stays the target.

**Placement decision:** the consumption unit lives on the **material type
schema**, next to the existing `stockUnit`. This mirrors how stock unit already
works: the type version is the source of truth for how a material is measured,
and the per-material stock-unit picker in the Add-material form is deliberately
disabled (`AddMaterialSection.tsx:186-199`) precisely so one catalog type never
mixes units. A per-material override was considered and rejected — it would
require a Jazz `MaterialCoMap` schema field, a `MaterialDTO` wire field, adapter
plumbing, an importer column and a stock-table column for a degree of freedom
that breaks aggregation the same way a per-material stock unit would.

## Change

All changes in this module are additive and optional-typed, so existing schema
versions (which have no `consumptionUnit`) keep working untouched.

### Schema type

- `store/materialTypes/state.ts` — `consumptionUnit?: string` on
  `MaterialTypeSchema`, documented like `stockUnit`: a `UnitNode.id` from the
  conversion graph; optional for backward compatibility; when absent the
  consumer falls back to `stockUnit` / the material's `stock.unit`.
- `store/materialTypes/resolveTypeSchema.ts` — **new**. Single resolver for
  type-level settings, used by the stock grid, the Composer computation
  middleware, and the process-usage form. It returns the type's **latest**
  schema, falling back to the material's pinned `schemaVersion` only when the
  type has no `latestSchema` entry. See the Status notes for why latest wins.

No change to `MaterialState`, `MaterialDTO`, `StockCoMap`/`MaterialCoMap`
(`kernel/modules/Store/schema.ts`), or `catalogAdapter.ts` — the schema travels
inside the already-existing `MaterialTypeVersionDTO.schemaJson` blob, so there is
no Jazz migration and no IPC surface change.

### Type authoring UI

- `components/MaterialTypesSection.tsx` — `consumptionUnit` state hook, a second
  `UnitSelector` row labelled "Unidade de consumo" (`data-testid=
  "add-material-type-consumption-unit"`) directly under the existing "Unidade de
  estoque" row, and `consumptionUnit: consumptionUnit || undefined` in the
  `MaterialTypeSchema` built in `handleConfirm`. Caption under the row reads
  "Em branco: usa a unidade de estoque."
- `components/UpdateMaterialTypeSection.tsx` — same field, prefilled from
  `latest.consumptionUnit ?? ""` in the type-selection effect
  (alongside `setStockUnit(latest.stockUnit ?? "")`), emitted the same way in
  `handleConfirm`, and added to its dependency array.
  `data-testid="update-material-type-consumption-unit"`, plus a `data-unit`
  mirror on both unit selectors so e2e waits on a selector rather than reading
  MUI's hidden input (e2e-tests.md §2).

The Add/Update **material** forms are not touched — the unit is not a
per-material field.

### Read-only surfacing

- `components/viewports/MaterialStockViewport/TableView.tsx` — read-only
  "Un. consumo" column next to the existing `stockUnit` one, resolved through
  `resolveTypeSchema`, blank when the schema declares none.
- `components/viewports/MaterialStockViewport/SummaryBar.tsx` — **unchanged**.
  Stock totals stay in the stock unit; consumption unit has no bearing on
  what is physically in the warehouse.

### Drivers and MCP tools

Follow the existing `stockUnit` plumbing exactly, one optional field each:

- `components/drivers/addMaterialType.form.puppeteer.ts` and
  `updateMaterialType.form.puppeteer.ts` — accept `consumptionUnit?: string`,
  open the new combobox and `clickOptionByDataValue` when provided.
- `mcpTools/addMaterialType.ts`, `addMaterialTypeShortcut.ts`,
  `updateMaterialType.ts`, `updateMaterialTypeShortcut.ts` — add the optional
  `consumptionUnit` zod field, thread it into the driver input, and mention it
  in the tool description ("target unit for usage calculations; defaults to the
  stock unit").

### Import

- `main/importer/parser.ts` — the XLSX importer reads a `stockUnit` column per
  material row; it does not author type schemas, so it is **unchanged**. If a
  spreadsheet ever needs to declare a consumption unit it will come in through
  the type-schema path, not the material row.

### Tests

- `tests/standalone/functionality/addMaterialType.e2e.test.ts` — two new cases:
  a type registered with `consumptionUnit: metros5` and `stockUnit:
  kilogramas6` prefills the Editar form's consumption selector with `metros5`;
  a type registered without one comes back blank. `expectTypeListed` gained an
  optional `consumptionUnit` argument that selects the type and waits on the
  `data-unit` mirror.
- `tests/standalone/functionality/updateMaterialType.e2e.test.ts` — new case:
  the base type has no consumption unit at `0.0.2`, and setting one on `0.0.3`
  carries into the successor. `expectTypeAtVersion` gained the same optional
  argument.
- `helpers/puppeteer/generateMaterialsCatalog.ts` — unchanged. The synthetic
  generator still sets only `stockUnit`, so the perf fixtures exercise the
  fallback path and existing budgets keep measuring the same work.

## Status notes

Implemented. `npx tsc -p webapp/tsconfig.json --noEmit` passes. The e2e cases
above were authored but not executed — they need a live Electron dev app on CDP
(`npm run test:e2e`), which was not running in this session.

Decisions settled during implementation:

1. Consumption unit lives on the type schema, not on the material row.
2. Blank/absent means "use the stock unit"; no sentinel value, no migration
   backfill of existing schema versions.
3. Where usage is displayed against stock, the Composer converts the total back
   into the stock unit so the two remain comparable — see the Composer half of
   this change document.
4. **The type's latest schema wins, not the material's pinned
   `schemaVersion`.** This resolves the open question the draft raised about
   version bumps. A pinned version records which attribute set the material's
   *data* conforms to; the consumption unit is a preference about how the type
   is measured and reported. Reading it from the pinned version would mean
   setting the unit changed nothing until every material was individually
   re-saved onto the successor version — and would have made the Composer's
   recompute-on-registration listener almost always a no-op. `resolveTypeSchema`
   encodes this in one place so the grid, the computation middleware, and the
   usage form cannot drift apart.

Remaining open question:

- Should the consumption unit be a full `UnitSelector` (any unit node) or
  restricted to units reachable from the stock unit in the conversion graph?
  Shipped unrestricted: unreachable targets surface as the existing per-step
  conversion error in the cost audit rather than being blocked at authoring
  time. Restricting it would need a reachability query the Converter module does
  not have.

## Security

None. The new field is an optional unit-node id inside an already-persisted,
already-synced schema JSON blob. It adds no new IPC surface, no new CoValue
field, no user-supplied expression, and no change to how `schemaJson` is
parsed. Unit ids are looked up in the conversion graph; an unknown id yields a
lookup miss and the existing conversion-error path, not an evaluation.

## Performance

Negligible in this module. One extra optional string per material-type schema
version (schemas are few and small; no change to per-material payload size, so
the 1k/10k/100k catalog seeding and sync-convergence budgets are unaffected).
The new `consumptionUnit` column in `TableView` resolves through the already
memoised `useMaterialTypes()` map — no additional per-row work beyond a map
lookup, and the stock grid is virtualised.

The cost-recompute impact (a second conversion hop) lands in Composer and is
budgeted there.
