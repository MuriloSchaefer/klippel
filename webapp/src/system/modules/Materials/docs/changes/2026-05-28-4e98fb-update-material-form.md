---
id: 2026-05-28-4e98fb
name: Update material form (schema-version-pinned)
description: Per-row Update opens a PointerContainer pre-filled from the material and rendering fields for its pinned schema version, dispatching updateMaterial on save.
status: implemented
modules: [Materials]
---

## Context

The materials table exposed an Update action, but it was only a hook
point: `MaterialStockViewport.handleUpdate` logged the request and never
opened a form. We need real editing: open a form for the selected
material, pre-filled with its current values, and dispatch
`updateMaterial`.

Key requirement: the form must render fields for the material's **pinned
`schemaVersion`**, not the type's latest schema — editing a row must not
silently migrate it to a newer schema shape.

## Change

New component
[`UpdateMaterialButton.tsx`](../../components/viewports/MaterialStockViewport/UpdateMaterialButton.tsx):

- Wraps the row's edit icon in a `PointerContainer` (mirrors
  `DeleteMaterialButton`), so the form anchors at the click/keyboard
  point. Trigger carries `id`/`data-testid` `material-row-update-<id>`.
- Resolves the schema as
  `materialTypes[type].schemas[material.schemaVersion]`, falling back to
  `schemas[latestSchema]` only when the pinned version is no longer
  registered. Attribute inputs render via the existing
  `SchemaDrivenFields`.
- Pre-fills stock amount, industry, external id, and the attribute block
  from the material's current state. `type` and stock **unit** are shown
  read-only (changing them is a type-migration concern, not a field edit).
- On confirm, dispatches `updateMaterial({ id, patch, industryId })`:
  - `patch` carries `attributes` (re-encoded via `encodeAttributeMap`),
    `stock`, the unchanged `schemaVersion`, `externalId`, and `updatedAt`.
  - `industryId` is sent so the manufacturedBy edge is set/cleared
    (`""` clears per the main handler at
    [main/materials.ts:790-822](../../main/materials.ts#L790-L822)).
  - `sellerIds` is intentionally omitted so existing supplier edges are
    preserved (the handler only rewrites suppliers when `sellerIds` is
    provided, [main/materials.ts:824-862](../../main/materials.ts#L824-L862)).

Wiring:
- `TableView` actions column now renders `<UpdateMaterialButton>` instead
  of the old `GridActionsCellItem` + `onUpdate` callback. The `onUpdate`
  prop is removed.
- `TableView`'s `Enter`-on-selected-row now `.click()`s the selected
  row's `material-row-update-<id>` trigger to open the form (previously
  called `onUpdate`).
- `MaterialStockViewport.handleUpdate` stub and its prop plumbing are
  removed; delete wiring is unchanged.

## Status notes

Implemented. The `e`-to-edit keyboard shortcut and its `ShortcutHint` are
tracked separately in [[2026-05-28-413884-materials-table-shortcuts]];
until that lands, the form is reachable via the row icon, `Enter`, and
click. Not yet covered by an e2e driver/test.

## Security

None. Renderer-side form that submits through the existing
`updateMaterial` IPC command; no new surface, no new validation gap (ids
are existing catalog keys, not user free-text).

## Performance

Negligible. One extra lightweight component per rendered grid row (the
edit trigger), replacing the previous `GridActionsCellItem`. The form
body mounts only while its `PointerContainer` is open.
