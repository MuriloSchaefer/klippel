---
id: 2026-05-11-8fffd9
name: Link-elective shortcut on process item
description: Add a `w` keyboard shortcut on the focused process row that opens the "link elective" panel via ProcessElectiveButton.
status: implemented
modules: [Composer]
---

## Context

The Processes accordion got list-scoped shortcuts in `2026-05-11-489951` (`a` add, `e` edit, `d` delete, arrows cycle). The `ProcessElectiveButton` action — which opens the panel to bind a process to an elective — is still mouse-only. With electives now first-class (commit `3df7547`) and processes routinely tagged to them, the link action deserves the same keyboard parity as edit/delete on the focused row.

## Change

UI (`webapp/src/system/modules/Composer/components/viewports/ProcessListAccordion/`):

- `ProcessElectiveButton.tsx`: add a `data-testid="process-item-link-elective"` to the trigger `IconButton` and accept an `isFocused` prop so the button can render a `ShortcutHint` (placement `top-center`, `alwaysShow={isFocused}`) bound to `Composer/ProcessItem/linkElective`. Per CLAUDE.md, the shortcut ships with a visible hint.
- `ProcessItem.tsx`: thread `isFocused` into `<ProcessElectiveButton />` (already tracked via `rowRef` + `isFocused` state, mirroring the existing `ProcessEditButton` wiring).

Shortcut registration (`webapp/src/system/modules/Composer/kernelCalls.ts`):

- New entry in the `PROCESS_LIST_CONTEXT_ID` block, alongside `editProcess`/`deleteProcess`:
  - `id: ${MODULE_NAME}/ProcessItem/linkElective`
  - `key: 'w'`
  - `action`: `document.activeElement?.closest('[data-testid="process-item"]')?.querySelector('[data-testid="process-item-link-elective"]')?.click()`
  - `description`: `Link focused process to elective`

Key choice: `w` is currently bound in two other contexts (`RibbonMenu` openModel, `GRADUATION_LIST_CONTEXT_ID` moveUp) — both scoped, so no collision inside `PROCESS_LIST_CONTEXT_ID`. Mnemonic: "vincular eletivo (Voto/HowToVote icon)" — closest available single key after `a/e/d` are taken.

Drivers + MCP tool (needed to author the e2e test):

- `ProcessElectiveButton.click.puppeteer.ts` — `clickProcessLinkElective(label)`: locate the row by `[data-process-label]`, click `[data-testid="process-item-link-elective"]`, wait for the pointer panel, drive the MUI `Select` to pick an elective by label, click `Confirmar`, wait for panel dismissal.
- `ProcessElectiveButton.shortcut.puppeteer.ts` — `triggerLinkElectiveOnFocused()`: focus row, dispatch `w`, then drive the same panel as above. Inline `page.evaluate` allowed in driver files only (`/* istanbul ignore file */` header).
- `linkProcessElective.ts` + `linkProcessElectiveShortcut.ts` MCP tools — input `{ processLabel: string, electiveLabel: string }`. Tools delegate browser work to drivers (no inline `page.evaluate` in tool files, per memory `feedback_no_page_evaluate_in_tools.md`). Register in `mcpTools/index.ts`.

E2E test (`mcpTools/tests/linkProcessElective.e2e.test.ts`):

- Boot the renderer, switch to Compositor, create + open a model, open garment details (mirror `deleteProcess.e2e.test.ts:33-53`).
- Add an elective via `addElectiveTool` (e.g. label `WaterproofE2E`).
- Add a process via `addProcessTool` (e.g. label `LinkE2E`).
- Run the link tool with `{ processLabel: 'LinkE2E', electiveLabel: 'WaterproofE2E' }`.
- Assertion: the process row at `rowSel('LinkE2E')` contains a chip with text matching the elective label (`page.waitForSelector('[data-testid="process-item"][data-process-label="LinkE2E"] .MuiChip-label')` then `expect(chipText).toBe('WaterproofE2E')`). The chip is already rendered in `ProcessItem.tsx:125-132` when `linkedElective` is set.
- Repeat for the shortcut variant via `linkProcessElectiveShortcutTool` to cover the `w` binding end-to-end.

## Status notes

Implemented. Decisions made during build:

- Bound to `w` per request — no collision since the other `w` bindings (`Composer/ModelSection/openModel` in `RibbonMenu`, `Composer/GraduationItem/moveUp` in `GRADUATION_LIST_CONTEXT_ID`) are scoped to different contexts.
- Tool inputs are `{ processLabel, electiveLabel }` (labels, mirroring the rest of the Process/Elective MCP surface).
- `ProcessElectiveButton` now accepts `isFocused`/`onClose` and renders the `ShortcutHint` inside the trigger `IconButton` (same shape as `ProcessEditButton`).
- Shortcut driver focuses the MUI `Select` and presses `ArrowDown` to open the listbox — no click on the trigger — so the shortcut path is genuinely keyboard-driven.
- E2E test seeds an elective + a process per variant, runs the link tool, asserts the chip with the elective label appears on the process row, then cleans up. Click and shortcut blocks each use only their own variant tools (per the MCP-tools skill rule).

## Security

None. Pure UI keybinding over an existing local action; no new data, auth, or input surface.

## Performance

None. Single `registerShortcuts` entry and one extra `ShortcutHint` per visible process row — same cost as the existing edit/delete hints.
