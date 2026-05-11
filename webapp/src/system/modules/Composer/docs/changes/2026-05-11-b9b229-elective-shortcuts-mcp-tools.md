---
id: 2026-05-11-b9b229
name: Elective shortcuts and MCP tools
description: Add keyboard shortcuts plus paired click/shortcut MCP tools (with E2E tests) for the ElectiveListAccordion CRUD surface.
status: implemented
modules: [Composer]
---

## Context

[ElectiveListAccordion](../../components/viewports/ElectiveListAccordion/index.tsx) renders the per-garment list of "Eletivo" entries inside the Composer `GarmentDetails` panel. Today this surface has no keyboard shortcuts, no `data-testid`s, and no co-located `*.puppeteer.ts` drivers — so MCP cannot reach this flow.

This change brings electives to parity with the material/graduation/visualization MCP surfaces: shortcut-discoverable controls with `ShortcutHint`, paired click/shortcut MCP tools per CRUD action, and an E2E suite. The underlying store actions for electives already exist; this change is UI affordances, MCP plumbing, and tests only.

## Change

### Component surface

Split [ElectiveListAccordion/index.tsx](../../components/viewports/ElectiveListAccordion/index.tsx) so each interactive control owns its drivers, matching the [GraduationListAccordion](../../components/viewports/GraduationListAccordion/) and [VisualizationListAccordion](../../components/viewports/VisualizationListAccordion/) layouts:

```
ElectiveListAccordion/
  index.tsx
  AddElectiveButton.tsx
  ElectiveItem.tsx
  ElectiveEditButton.tsx
  drivers/
    AddElectiveButton.click.puppeteer.ts
    AddElectiveButton.shortcut.puppeteer.ts
    ElectiveItem.click.puppeteer.ts
    ElectiveItem.shortcut.puppeteer.ts
```

UI affordances:

- List root: `data-testid="elective-list"`.
- Each row: `data-testid="elective-item"` + `data-elective-label="<node.label>"` + `tabIndex={0}` so shortcuts resolve the focused row via `document.activeElement.closest('[data-testid="elective-item"]')`.
- Row focus styling mirrors [MaterialItem.tsx:77-83](../../components/viewports/MaterialListAccordion/components/MaterialItem.tsx#L77-L83); focus returns to the row on save/cancel via the same `refocusAfterEditRef` pattern.
- `AddElectiveButton` trigger: `data-testid="add-elective"`. Pointer panel inputs: `add-elective-name`, `add-elective-default` (toggle marking this elective as the default), `add-elective-confirm`.
- `ElectiveEditButton` trigger: `data-testid="elective-item-edit"`; panel mirrors the add testids with an `edit-elective-` prefix. Delete control: `data-testid="elective-item-delete"`.
- Every shortcut-bound control renders `ShortcutHint` (CLAUDE.md rule).

### Shortcuts

Per the project-wide CRUD convention (`a` / `e` / `d` for add / edit / delete; see [KeyboardShortcuts SKILL.md](../../../../../../kernel/modules/KeyboardShortcuts/docs/skills/SKILL.md)). Registered in [Composer/kernelCalls.ts](../../kernelCalls.ts) under a new dedicated `Composer/ElectiveList` context — scoped to the accordion so `a` / `e` / `d` do not collide with sibling lists.

| Action | Binding | Resolution |
|---|---|---|
| Expand "Eletivo" accordion + focus first row | `Ctrl+Alt+E` | Opens the accordion if collapsed, focuses the first `elective-item`. Mirrors `focusMaterialList`. |
| Focus next elective | `ArrowDown` | `…closest('[data-testid="elective-item"]')?.nextElementSibling` |
| Focus previous elective | `ArrowUp` | `…previousElementSibling` |
| Add elective (open panel) | `a` | Clicks the `add-elective` trigger. Active only under `Composer/ElectiveList`. |
| Edit focused elective | `e` | Resolved from the focused row. |
| Delete focused elective | `d` | Resolved from the focused row. |

Each control renders `ShortcutHint` for its binding.

### MCP tools (paired click + shortcut)

New files under [webapp/src/system/modules/Composer/mcpTools/](../../mcpTools/), one pair per action:

| Click variant | Shortcut variant |
|---|---|
| `addElective.ts` | `addElectiveShortcut.ts` |
| `editElective.ts` | `editElectiveShortcut.ts` |
| `deleteElective.ts` | `deleteElectiveShortcut.ts` |

Plus focus-management tools mirroring `focusMaterialList` / `cycleMaterialFocus`:

| Tool | Purpose |
|---|---|
| `focusElectiveList.ts` | Opens the Eletivo accordion and focuses the first `elective-item`. |
| `cycleElectiveFocus.ts` | Walks `ArrowDown`/`ArrowUp` n times from the focused row. Errors if no row is focused (mirrors [cycleMaterialFocus.ts:37](../../mcpTools/cycleMaterialFocus.ts#L37)). |

All tools registered in [mcpTools/index.ts](../../mcpTools/index.ts).

Conventions (per [mcp-puppeteer-tools skill](../../../../../../../.claude/skills/mcp-puppeteer-tools/SKILL.md)):

- All tools first ensure the Settings panel is expanded and the "Eletivo" accordion is open (reuse `ensureSettingsPanelExpanded` / `expandAccordion`).
- **Inputs** — `addElective` takes `{ name: string, isDefault?: boolean }` (default `false`); `editElective` takes the same shape keyed by the current label; `deleteElective` takes the label. Marking one elective as `isDefault: true` should follow whatever single-default behavior the existing store action enforces (the tool does not duplicate that logic).
- **Click variant**: opens the panel via testid, fills the name input, toggles `add-elective-default` if requested, clicks confirm. Asserts a new `elective-item` row appears with the matching label.
- **Shortcut variant**: identical contract via keyboard (`a` to open the panel, typing into the focused name input, `Tab` + `Space` to toggle default, `Enter` to confirm). Drivers are co-located and do not cross-import from the click variant.

### Puppeteer drivers (under `ElectiveListAccordion/drivers/`)

- `AddElectiveButton.click.puppeteer.ts` — testid constants and helpers (`openAddElectivePanel`, `confirmAddElective`, `waitForElectiveItem`).
- `AddElectiveButton.shortcut.puppeteer.ts` — `OPEN_ADD_ELECTIVE_BINDING = 'a'`, `pressOpenAddElective(page)`, plus shortcut analogs for confirm. No `page.click` fallbacks.
- `ElectiveItem.click.puppeteer.ts` / `.shortcut.puppeteer.ts` mirror the split for edit + delete.

### Tests

Under [mcpTools/tests/](../../mcpTools/tests/), both variants in the same suite per skill rule:

- `mcpTools/tests/addElective.e2e.test.ts`
- `mcpTools/tests/editElective.e2e.test.ts`
- `mcpTools/tests/deleteElective.e2e.test.ts`

Each suite asserts the click and shortcut variants produce identical effects: a new `ELECTIVE` graph node, a visible `elective-item` row, and the row label matches. Edit/delete suites also assert focus is preserved on the originating row after the action.

Skip when CDP is unreachable, matching the other Composer suites.

## Status notes

Implemented. Surface shipped on this branch:

- `ElectiveListAccordion/` split into `index.tsx` + `AddElectiveButton.tsx` + `ElectiveItem.tsx` + `ElectiveEditButton.tsx` with the testid + focus + `ShortcutHint` plumbing described above.
- Shortcuts registered in [kernelCalls.ts](../../kernelCalls.ts) under the new `ELECTIVE_LIST_CONTEXT_ID`, including the `Ctrl+Alt+E` focus chord and `a`/`e`/`d`/`ArrowUp`/`ArrowDown` row bindings; the elective accordion is wrapped in a `FocusShortcutProvider` in [GarmentDetails.tsx](../../components/viewports/ModelViewport/DetailPanel/GarmentDetails.tsx).
- Drivers: [AddElectiveButton.click](../../components/viewports/ElectiveListAccordion/drivers/AddElectiveButton.click.puppeteer.ts), [.shortcut](../../components/viewports/ElectiveListAccordion/drivers/AddElectiveButton.shortcut.puppeteer.ts), [ElectiveItem.click](../../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.click.puppeteer.ts), [.shortcut](../../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.shortcut.puppeteer.ts).
- MCP tools: [addElective](../../mcpTools/addElective.ts) / [Shortcut](../../mcpTools/addElectiveShortcut.ts), [editElective](../../mcpTools/editElective.ts) / [Shortcut](../../mcpTools/editElectiveShortcut.ts), [deleteElective](../../mcpTools/deleteElective.ts) / [Shortcut](../../mcpTools/deleteElectiveShortcut.ts), [focusElectiveList](../../mcpTools/focusElectiveList.ts), [cycleElectiveFocus](../../mcpTools/cycleElectiveFocus.ts) — all registered in [mcpTools/index.ts](../../mcpTools/index.ts).
- E2E tests: [addElective](../../mcpTools/tests/addElective.e2e.test.ts), [editElective](../../mcpTools/tests/editElective.e2e.test.ts), [deleteElective](../../mcpTools/tests/deleteElective.e2e.test.ts).

Default-toggle semantics confirmed: `addElective` stores `value === defaultValue` initially, edit lets the user mutate either independently; no single-default invariant is enforced by the store, so the tool does not attempt to enforce one either. Multiple electives can carry `defaultValue: true` simultaneously, matching the existing UI behavior.

## Security

`name` and any other inputs are caller-supplied strings written into graph state and surfaced as `data-elective-label` attributes. Tools must reject names containing characters that would break attribute interpolation (quotes, angle brackets) at the tool boundary, and look rows up via `[data-elective-label="..."]` attribute equality rather than interpolating into a CSS selector. No new IPC surface, no new external endpoints, no secret handling.

## Performance

None expected. Each tool is a single user-equivalent interaction sequence reading/writing one graph node. Test cost adds three Jest specs driving two CDP scenarios each — bounded and parallelizable with the existing Composer suites.
