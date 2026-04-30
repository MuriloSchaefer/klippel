---
id: 2026-04-29-8477dc
name: Edit and delete material node MCP tools
description: Add MCP tools (click + shortcut variants) to edit and delete material nodes inside a Composer variation.
status: partially implemented
modules: [Composer, Materials]
---

## Context

The Composer's `MaterialListAccordion` already renders existing material nodes via `MaterialItem` with `EditMaterial` / `ShowMaterial` sub-components, and `MaterialItem` is wired to `variation.actions.removeMaterial(node.materialId)` for deletion. Today only `addMaterial` is exposed as an MCP tool — agents can create material nodes but cannot modify or remove them. To complete CRUD coverage of a variation's material list, two new tool pairs are needed: `editMaterial` / `editMaterialShortcut` and `deleteMaterial` / `deleteMaterialShortcut`.

## Change

### Composer module

New tool files under [webapp/src/system/modules/Composer/mcpTools/](../../mcpTools/):

- `editMaterial.ts` / `editMaterialShortcut.ts` — locate a material node by its UI `label` (the visible text on `MaterialItem`) inside the active `VariationViewport`, open its edit form via `EditMaterial`, and apply the patch (new label / type / material / extra / materialId). Reuses `MaterialType.click.puppeteer` and `Material.click.puppeteer` selectors from the Materials module, plus the Pointer panel helpers, exactly like `addMaterial.ts`.
- `deleteMaterial.ts` / `deleteMaterialShortcut.ts` — locate the same node by `label` and trigger its delete affordance (the existing `onDelete` in [MaterialItem.tsx:68](../../components/viewports/MaterialListAccordion/components/MaterialItem.tsx#L68)). Confirm the destructive prompt if any.

Both tools must:

- Ensure the Settings panel is expanded and the "Materiais" accordion is open before acting (`ensureSettingsPanelExpanded`, `expandAccordion`).
- Resolve the target row via a stable `data-testid` on `MaterialItem` keyed by label (e.g. `material-item-<label>`) — add the testid on the component if missing.
- Register both tools in [mcpTools/index.ts](../../mcpTools/) so `registerMcpTools(server)` attaches them; `electron/main/mcp/index.ts` stays a one-line registrar.

New co-located Puppeteer drivers next to the affected components:

- `MaterialItem.click.puppeteer.ts` — exports the `material-item-*` testid constants, `clickEditMaterial(page, key)` and `clickDeleteMaterial(page, key)`.
- `MaterialItem.shortcut.puppeteer.ts` — exports the binding constants (e.g. `EDIT_MATERIAL_BINDING`, `DELETE_MATERIAL_BINDING`) plus `triggerEditMaterialFromFocused` / `triggerDeleteMaterialFromFocused`.
- `EditMaterial.click.puppeteer.ts` (new) — drives the inline edit form fields and confirm/cancel; mirrors what `addMaterial.ts` does today inline against the add form.
- `EditMaterial.shortcut.puppeteer.ts` — focused-field helpers (`typeLabelFromFocused`, etc.) reusing the existing listbox helpers in `electron/main/mcp/helpers/`.

Shortcut wiring on `MaterialItem` (or a dedicated focus container) must register through `keyboardManager.functions.registerShortcuts` and pair every binding with a visible `ShortcutHint` from `@kernel/modules/KeyboardShortcuts`, per the project rule.

Tests co-located: `editMaterial.test.ts`, `editMaterialShortcut.test.ts`, `deleteMaterial.test.ts`, `deleteMaterialShortcut.test.ts`. Each connects via CDP, mocks `getPage`, calls `tool.execute(...)` against a seeded variation, and asserts the resulting store state (label/type/material updated, or node removed). Skip when CDP is unreachable.

### Materials module

If the material/type selectors need any new scoping mode to support an "edit" form (different `data-testid` prefix, e.g. `edit-material-*`), extend the click drivers in [webapp/src/system/modules/Materials/components/selectors/](../../../Materials/components/selectors/) to accept a `scopeTestId` and have `EditMaterial.tsx` apply the matching testids. No business-logic change in this module — only test-id discoverability.

## Status notes

Fully implemented:
- `editMaterial`/`editMaterialShortcut` and `deleteMaterial`/`deleteMaterialShortcut` tools created and registered.
- `mcpTools/index.ts` created with `registerMcpTools(server)` function following the documented module registrar pattern; `electron/main/mcp/index.ts` calls this registrar (one-line call only).
- `MaterialItem` row carries `data-testid="material-item"` + `data-material-label="<label>"` and is `tabIndex=0` so it is focusable for the shortcut path.
- `ShowMaterial` edit/delete `IconButton`s carry `data-testid="material-item-edit"` / `material-item-delete` and are wrapped in `ShortcutHint`.
- `EditMaterial` form scoped via `data-testid="edit-material-form"` with `edit-material-type`, `edit-material-material`, `edit-material-save`, `edit-material-cancel` inside.
- Shortcuts `e` (edit focused material) and `Shift+m` (remove focused material) registered in [Composer/kernelCalls.ts](../../kernelCalls.ts) under the `Composer/ModelViewport` context. Actions resolve the focused row via `document.activeElement.closest('[data-testid="material-item"]')`.
- Co-located drivers: [MaterialItem.click.puppeteer.ts](../../components/viewports/MaterialListAccordion/components/MaterialItem.click.puppeteer.ts), [MaterialItem.shortcut.puppeteer.ts](../../components/viewports/MaterialListAccordion/components/MaterialItem.shortcut.puppeteer.ts), [EditMaterial.click.puppeteer.ts](../../components/viewports/MaterialListAccordion/components/EditMaterial.click.puppeteer.ts), [EditMaterial.shortcut.puppeteer.ts](../../components/viewports/MaterialListAccordion/components/EditMaterial.shortcut.puppeteer.ts).
- Jest tests next to each tool (skip when CDP unreachable).
- Test import paths normalized to use relative paths consistently.
- Material node deletion now uses `removeMaterialNode(nodeId)` instead of `removeMaterial(materialId)` for better API clarity.

Left to verify in a live dev app:
- Tab order from a focused row into the inline `EditMaterial` form (single Tab to type, then to material). If MUI focus traps differ, the `editMaterialShortcut` tool's Tab counts may need adjusting.
- Whether `EditMaterial`'s scope can change the `type` (the form uses `typeRestrictions` to filter) — the tool exposes `type` as optional and skips that step when omitted.

Open questions:

- **Node addressing**: keyed by the UI `label` shown on `MaterialItem`. Confirm uniqueness of labels per variation is enforced; if not, the tools target the first match and surface a warning.
- **Delete confirmation**: does `removeMaterialNode` currently prompt? If so, the click driver must dismiss the confirm; if not, the shortcut variant doesn't need to handle it.

## Security

None. Both tools operate entirely on the local app's Redux store via the same actions already available through the UI; no new IPC, no new external surface, no secrets.

## Performance

None expected. Each tool is a single user-equivalent interaction (click/keystroke sequence) and does not introduce new render paths or store subscriptions. Test cost is bounded — four new Jest specs that each run one CDP scenario.
