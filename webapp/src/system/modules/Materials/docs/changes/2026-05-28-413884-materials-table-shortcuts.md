---
id: 2026-05-28-413884
name: Materials table keyboard shortcuts (arrows / d / e)
description: Cycle table rows with arrow keys and add `d` to delete / `e` to edit the selected material, each paired with a visible ShortcutHint.
status: partially implemented
modules: [Materials]
---

## Context

The `MaterialStockViewport` table already supports rudimentary keyboard
navigation, but it is ad-hoc and partially hidden:

- Arrow Up / Down cycle the selected row (wrapping top↔bottom), `Escape`
  clears the selection, and `Enter` opens the Update form. All of this is
  handled locally in `TableView.handleKeyDown`
  ([TableView.tsx:205-226](../../components/viewports/MaterialStockViewport/TableView.tsx#L205-L226))
  — it is **not** registered through `keyboardManager`, so there are no
  `ShortcutHint`s and the bindings are undiscoverable.

We want first-class, discoverable shortcuts for the three table actions
the user reaches for most:

- **Arrow Up / Down** — cycle the selected row (formalize the existing
  behaviour).
- **`d`** — delete the selected material (opens the existing delete
  confirmation `PointerContainer`).
- **`e`** — edit the selected material (opens the Update form
  `PointerContainer` — see the sibling change
  [[2026-05-28-4e98fb-update-material-form]]).

Per the repo `CLAUDE.md` rule, **every registered shortcut must ship with
a visible `ShortcutHint`** — no "secret keys".

## Change

Scope: `Materials/MaterialStockViewport` keyboard context (the
`ShortcutProvider` already wraps the viewport at
[index.tsx:109](../../components/viewports/MaterialStockViewport/index.tsx#L109)).

Planned bindings (registered in `kernelCalls.ts` `postBootInitialization`
alongside the existing viewport shortcuts at
[kernelCalls.ts:114-147](../../kernelCalls.ts#L114-L147)):

| Key | Action | Proposed `shortcutId` |
|---|---|---|
| `ArrowDown` / `ArrowUp` | Cycle selected row (wrap) | `Materials/MaterialStockViewport/cycleRow{Down,Up}` |
| `d` | Delete selected material | `Materials/MaterialStockViewport/deleteSelected` |
| `e` | Edit selected material | `Materials/MaterialStockViewport/editSelected` |

`d` / `e` actions resolve the currently-selected row and `.click()` its
trailing-column trigger button (`material-row-delete-<id>` /
`material-row-update-<id>`), mirroring how the ribbon shortcuts drive the
Add form via `document.getElementById(...).click()`
([kernelCalls.ts:64-110](../../kernelCalls.ts#L64-L110)). This reuses the
existing `PointerContainer` triggers rather than duplicating dispatch
logic.

Note `e` is already bound to `Materials/TiposDeMateriais/addType`, but in a
**different** keyboard context (`Materials/TiposDeMateriais`, RibbonMenu
scope), so there is no collision inside the viewport context.

### ShortcutHint placement (open question)

The hint rule is the main design wrinkle. Action triggers live in
per-row DataGrid cells, so a hint on "the selected row's button" is
awkward (rows are virtualized; only rendered rows are in the DOM).
Candidate approaches to decide before implementation:

1. **Toolbar legend** — render hint chips for `d` / `e` (and arrow nav) in
   `MaterialStockToolbar` or `SummaryBar`, independent of which row is
   selected. Simplest; hints are always visible.
2. **Selected-row affordance** — wrap the selected row's Update/Delete
   icons in `ShortcutHint`. Most contextual but fights grid virtualization
   and re-renders.
3. **Hybrid** — toolbar legend for the action keys, keep arrow cycling as
   documented in-grid behaviour.

Resolved (option 2 — selected-row affordance): the hint is rendered on
the **selected** row's Update/Delete icons only, not every row. The
`ShortcutHint` is gated by a `selected` prop passed from `TableView`
(`String(params.id) === selectedId`, with `selectedId` added to the
columns `useMemo` deps).

## Status notes

Partially implemented.

**Done:**
- `d` / `e` registered in the `Materials/MaterialStockViewport` context
  ([kernelCalls.ts](../../kernelCalls.ts)); each action clicks the
  selected DataGrid row's trailing trigger
  (`.MuiDataGrid-row.Mui-selected [data-testid^="material-row-{update,delete}-"]`).
- `ShortcutHint`s on the selected row's edit/delete icons
  (`UpdateMaterialButton` / `DeleteMaterialButton`, gated by `selected`).

**Left:**
- **Arrow cycling** still lives in `TableView.handleKeyDown` (local, no
  registered shortcut / hint). Moving it to the registered-shortcut path
  needs the current `materials` list + `selectedId`, which live in
  viewport state, not `kernelCalls` — deferred.
- `Enter`-to-edit remains and now coexists with `e` (both open the
  selected row's Update form). Kept intentionally; revisit if redundant.
- No e2e driver/test yet for `d` / `e`.

## Security

None. Pure renderer-side keyboard wiring; no new IPC, no new data exposure.

## Performance

Negligible. A handful of additional registered shortcuts and (depending on
placement) a small always-mounted hint legend. No new render-hot paths.
