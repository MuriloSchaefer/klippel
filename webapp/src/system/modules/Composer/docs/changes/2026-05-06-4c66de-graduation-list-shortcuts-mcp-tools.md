---
id: 2026-05-06-4c66de
name: Graduation list shortcuts and MCP tools
description: Add keyboard shortcuts plus paired click/shortcut MCP tools (with E2E tests) for the GraduationListAccordion CRUD + reorder surface.
status: draft
modules: [Composer]
---

## Context

[GraduationListAccordion](../../components/viewports/GraduationListAccordion/index.tsx) renders the per-garment graduation list inside a Composer variation. It already supports add (multi via comma), inline rename, amount edit (debounced), delete, and deterministic reorder via Up/Down `IconButton`s. Today none of this is reachable from MCP, and none of the controls have keyboard bindings or `ShortcutHint`s — agents can drive materials end-to-end (`addMaterial`, `editMaterial`, `deleteMaterial`, focus/cycle helpers) but cannot touch graduations at all. This change brings graduations to parity with materials: shortcut-discoverable UI controls, paired click/shortcut MCP tools per action, and one co-located E2E suite per feature.

The store-level actions are already in place — `addGraduations`, `updateGraduation`, `removeGraduation`, `reorderGraduations` on [useVariation.ts:392-466](../../hooks/useVariation.ts#L392-L466) — so this change is UI affordances, MCP plumbing, and tests; no new graph mutations.

## Change

### New / modified component surface

[GraduationListAccordion/index.tsx](../../components/viewports/GraduationListAccordion/index.tsx) — split the file so each interactive surface owns its drivers cleanly:

```
GraduationListAccordion/
  index.tsx
  AddGraduationButton.tsx                        (extracted)
  AddGraduationButton.click.puppeteer.ts
  AddGraduationButton.shortcut.puppeteer.ts
  GraduationItem.tsx                             (extracted)
  GraduationItem.click.puppeteer.ts
  GraduationItem.shortcut.puppeteer.ts
```

UI affordances:

- Each `GraduationItem` row gets `data-testid="graduation-item"` + `data-graduation-label="<label>"` + `tabIndex={0}` so the shortcut path can resolve the focused row via `document.activeElement.closest('[data-testid="graduation-item"]')`, mirroring the material pattern.
- Row focus styling matches [MaterialItem.tsx:77-83](../../components/viewports/MaterialListAccordion/components/MaterialItem.tsx#L77-L83): `border: "2px solid transparent"`, `borderRadius: 1`, `transition: "border-color 0.15s, box-shadow 0.15s"`, and `&:focus, &:focus-visible, &:focus-within { outline: none; borderColor: "primary.main" }`. The currently-focused row therefore gets a primary-colored border, and focus is preserved while editing because of `:focus-within`.
- After save/cancel of the inline edit form, focus returns to the row via a `refocusAfterEditRef` pattern (same as `MaterialItem`).
- `AddGraduationButton` trigger gets `data-testid="add-graduation"`; the inline panel form fields get `add-graduation-names` / `add-graduation-confirm`.
- `GraduationItem` action `IconButton`s get `data-testid="graduation-item-edit" | "-delete" | "-move-up" | "-move-down" | "-save" | "-cancel"`, and each is wrapped in `ShortcutHint` from `@kernel/modules/KeyboardShortcuts` (CLAUDE.md rule: no shortcut without a visible hint).
- The inline edit form gets `data-testid="edit-graduation-form"` with `edit-graduation-label` / `edit-graduation-amount` / `edit-graduation-save` / `edit-graduation-cancel` inside.

### Shortcuts

Registered in [Composer/kernelCalls.ts](../../kernelCalls.ts) under the existing `Composer/ModelViewport` context (alongside the material bindings). Proposed bindings — chosen to not collide with material `e` / `Shift+m`:

| Action | Binding | Resolution |
|---|---|---|
| Expand "Graduações" accordion + focus first row | `Ctrl+Alt+G` | Opens the accordion if collapsed, then focuses the first `graduation-item`. Mirrors the `focusMaterialList` toggle pattern but uses a chord to avoid colliding with bare-letter shortcuts active while a row is focused. |
| Focus next graduation | `ArrowDown` | `document.activeElement.closest('[data-testid="graduation-item"]')?.nextElementSibling` |
| Focus previous graduation | `ArrowUp` | `…previousElementSibling` |
| Add graduation (open panel) | `g` | Clicks the `add-graduation` trigger |
| Edit focused graduation | `r` (rename) | Resolved from focused row |
| Delete focused graduation | `d` | Same focus resolution |
| Move focused graduation up | `w` | Same focus resolution |
| Move focused graduation down | `s` | Same focus resolution |

The `ArrowDown` / `ArrowUp` cycling actions are siblings-walks identical in shape to [kernelCalls.ts:198-228](../../kernelCalls.ts#L198-L228) — only the testid differs. Reorder uses bare `w` / `s` (active only while a graduation row is focused — the `GraduationList` focus-driven context), so it does not collide with the bare arrows that cycle row focus.

Bindings are tentative — adjust at register-time if any clash with an existing global. Each control on the row must render `ShortcutHint` for its binding.

### MCP tools (paired click + shortcut)

New files under [webapp/src/system/modules/Composer/mcpTools/](../../mcpTools/), one pair per action:

| Click variant | Shortcut variant |
|---|---|
| `addGraduations.ts` | `addGraduationsShortcut.ts` |
| `editGraduation.ts` | `editGraduationShortcut.ts` |
| `deleteGraduation.ts` | `deleteGraduationShortcut.ts` |
| `reorderGraduation.ts` | `reorderGraduationShortcut.ts` |

Plus two focus-management tools mirroring `focusMaterialList` / `cycleMaterialFocus`:

| Tool | Purpose |
|---|---|
| `focusGraduationList.ts` | Opens the Graduações accordion and focuses the first `graduation-item` (calls the `Ctrl+Alt+G` action via the click path; the shortcut variant just presses the binding). Single-variant: this primitive doesn't need a separate keyboard tool since the act of pressing the binding is itself the shortcut path — model after `focusMaterialList.ts`. |
| `cycleGraduationFocus.ts` | Walks `ArrowDown`/`ArrowUp` n times from the currently focused row. Errors out if no `graduation-item` is focused, mirroring [cycleMaterialFocus.ts:37](../../mcpTools/cycleMaterialFocus.ts#L37). |

Tool conventions (per [mcp-puppeteer-tools skill](../../../../../.claude/skills/mcp-puppeteer-tools/SKILL.md) and [mcp-server.md](../../../../docs/mcp-server.md)):

- All tools first ensure the Settings panel is expanded and the "Graduações" accordion is open (reuse `ensureSettingsPanelExpanded` / `expandAccordion` helpers, same as material tools).
- Click variants compose `*.click.puppeteer.ts` drivers only; shortcut variants compose `*.shortcut.puppeteer.ts` drivers only. No cross-imports.
- Tools own `Tab` traversal between fields (e.g. `editGraduationShortcut` tabs from focused row → label field → amount field → save).
- Inputs:
  - `addGraduations`: `{ variationId, garmentId, names: string[] }` — types `names.join(", ")` into the panel and confirms.
  - `editGraduation`: `{ variationId, garmentId, label, changes: { label?, amount? } }` — locates by `data-graduation-label`.
  - `deleteGraduation`: `{ variationId, garmentId, label }`.
  - `reorderGraduation`: `{ variationId, garmentId, label, direction: "up" | "down", steps?: number }` — repeats the up/down driver `steps` times.
- Register both variants of each pair in [mcpTools/index.ts](../../mcpTools/index.ts) so `registerMcpTools(server)` attaches all 8; `electron/main/mcp/index.ts` stays a one-line call.

### Co-located Puppeteer drivers

`AddGraduationButton.click.puppeteer.ts`:
- Exports `ADD_GRADUATION_TESTID`, `clickAddGraduation(page)`, `typeNamesAndConfirm(page, names: string)`.

`AddGraduationButton.shortcut.puppeteer.ts`:
- Exports `ADD_GRADUATION_BINDING`, `triggerAddGraduation(page)` (presses key, waits for `add-graduation-names` to be focused — `PointerContainer` already auto-focuses the first field), `typeNamesAndConfirmFromFocused(page, names)`.

`GraduationItem.click.puppeteer.ts`:
- Exports `GRADUATION_ITEM_TESTID`, plus `clickEdit(page, label)`, `clickDelete(page, label)`, `clickMoveUp(page, label)`, `clickMoveDown(page, label)`, `clickSave(page, label)`, `clickCancel(page, label)`.
- `EditGraduationForm` selectors live here too (or a sibling `EditGraduationForm.click.puppeteer.ts` if it grows).

`GraduationItem.shortcut.puppeteer.ts`:
- Exports the four binding constants and `focusGraduationByLabel(page, label)` (Tab-walks through the rows asserting `data-graduation-label`), plus `triggerEditFromFocused`, `triggerDeleteFromFocused`, `triggerMoveUpFromFocused`, `triggerMoveDownFromFocused`. No `page.click` to recover focus — failing loudly is the regression we want.
- Per-field helpers `typeLabelFromFocused`, `typeAmountFromFocused`.

No new generic helpers are anticipated; if the panel-confirm pattern needs reuse beyond materials/graduations, promote to `electron/main/mcp/helpers/`.

### Tests

One file per feature, both variants in the same suite (per skill rule):

- `addGraduations.e2e.test.ts`
- `editGraduation.e2e.test.ts`
- `deleteGraduation.e2e.test.ts`
- `reorderGraduation.e2e.test.ts`

Each connects via CDP, mocks `getPage`, shares one workspace fixture (e.g. `e2e-graduations`), and exposes `'<feature> via click (E2E)'` + `'<feature> via shortcut (E2E)'` describe blocks. The shortcut block must use only shortcut-variant tools for any cross-tool seeding (e.g. seed graduations with `addGraduationsShortcutTool`, not the click variant). Skip when CDP unreachable.

Assertions read store state from the variation graph (e.g. graduation node count, `label`, `amount`, and post-reorder `order` values) rather than DOM-only checks, matching the material suites.

## Status notes

Draft. Open decisions before implementation:

- **Binding choices** — `Ctrl+Alt+G`, `g`, `r`, `d`, `w/s`, bare `ArrowUp/Down` need a sweep against the existing `Composer/ModelViewport` registrations (and any global shortcut on the layout) before locking in. `ArrowUp/Down` in particular: confirm no other registration in the same context already claims bare arrows; if so, scope row-cycling to a sub-context (e.g. `Composer/GraduationList`) activated while a row is focused.
- **Reorder semantics in the tool** — should `reorderGraduation` accept `{ label, direction, steps }` (repeat existing up/down primitive) or `{ label, toIndex }` / `{ orderedLabels: string[] }` (drive `reorderGraduations(ids)` directly)? The former matches the visible UI affordance; the latter is closer to the store action and avoids N keypresses for long lists. Lean toward `{ direction, steps }` for parity with the keyboard surface, but worth confirming with how agents tend to use it.
- **Label uniqueness** — graduation labels per garment may not be enforced unique. If duplicates exist, tools target the first match and surface a warning, mirroring the material-tool decision.
- **`AddGraduationButton` panel close** — confirm `ConfirmAndCloseButton` actually closes the `PointerContainer` after `handleConfirm`; the click driver's post-condition `waitForSelector` should assert the panel is gone before returning.
- **Amount debounce** — `updateGraduation` is debounced 400 ms inside `GraduationItem`. The edit tool must wait past the debounce (or commit via Save) before asserting store state, otherwise tests will flake. Prefer driving Save explicitly.

No code has been written yet; this document is the implementation contract.

## Security

None. All four tools operate on the local Redux store via actions already exposed through the UI. No new IPC surface, no new external endpoints, no secret handling.

## Performance

None expected. Each tool is a single user-equivalent interaction sequence; no new render paths, no new store subscriptions. Test cost adds 4 Jest specs that each drive one CDP scenario per variant — bounded and parallelizable with the existing material suites.
