---
id: 2026-05-11-489951
name: Process accordion shortcuts and MCP tools
description: Add keyboard shortcuts and an 8-tool MCP surface for the Processes accordion, mirroring the electives work in 3df7547.
status: implemented
modules: [Composer]
---

## Context

The Processes accordion (`ProcessListAccordion`) is the last major garment-detail accordion without keyboard shortcuts or an MCP driving surface. Electives, graduations, materials, and visualizations all expose paired click + shortcut tools so agents (and keyboard users) can manipulate them end-to-end. Processes lag behind: the delete button on each row is not even wired, and there are no testids, no focus affordances, no `ShortcutHint` wraps, and no drivers.

This change brings processes in line with the electives precedent (commit `3df7547`) so an agent can create, edit, delete, focus, and cycle processes without touching the mouse.

## Change

UI refactor under `webapp/src/system/modules/Composer/components/viewports/ProcessListAccordion/`:

- Split `index.tsx` into siblings: `AddProcessButton.tsx`, `ProcessItem.tsx`, `ProcessEditButton.tsx` (already exists — extend it with `ShortcutHint` + `isFocused` prop).
- Add testids (`process-list`, `process-item`, `add-process`, `new-process-name`, `add-process-form`, `edit-process-form`, etc.) and a focus state on `ProcessItem` (rowRef + tabIndex + isFocused), matching `ElectiveItem`.
- Wrap actionable controls with `ShortcutHint` (CLAUDE.md rule — no shortcut ships without a hint). Shortcut ids: `Composer/ProcessList/{addProcess,focusProcessList,cycleFocus}`, `Composer/ProcessItem/{editProcess,deleteProcess}`.
- Register the shortcuts via `keyboardManager.functions.registerShortcuts`. Suggested bindings: `Ctrl+Alt+P` focus list, `ArrowDown`/`ArrowUp` cycle, `a` add, `e` edit focused row, `Delete`/`d` delete focused row.

State layer:

- Add `removeProcess(nodeId)` to `webapp/src/system/modules/Composer/hooks/useVariation.ts`. Must clean up the node plus all anchored edges: `HAS_PROCESS`/`PROCESS_OF`, plus any `CONSUMES`/`CONSUMED_BY` whose source or target is the process node. Wire the existing delete `IconButton` in `ProcessListAccordion` to call it.

Puppeteer drivers under `ProcessListAccordion/drivers/`:

- `AddProcessButton.click.puppeteer.ts` — open panel, type name, drive the two `CompoundSelector`s for `costTime` and `costMoney`, exported testid constants.
- `AddProcessButton.shortcut.puppeteer.ts` — `triggerAddProcess`, `typeAddProcessNameFromFocused`, cost-setting variants. Inline `page.evaluate` is permitted here (driver files only, `/* istanbul ignore file */` header).
- `ProcessItem.click.puppeteer.ts` — `waitForProcessItem`, `clickProcessEdit`, `clickProcessDelete`.
- `ProcessItem.shortcut.puppeteer.ts` — `triggerFocusProcessList`, `triggerCycleProcessFocus`, `triggerEditFocusedProcess`, `triggerDeleteFocusedProcess`.

MCP tools under `webapp/src/system/modules/Composer/mcpTools/` (plus registration in `mcpTools/index.ts`):

- `addProcess.ts` + `addProcessShortcut.ts`
- `editProcess.ts` + `editProcessShortcut.ts`
- `deleteProcess.ts` + `deleteProcessShortcut.ts`
- `focusProcessList.ts`
- `cycleProcessFocus.ts`

Add/edit tool inputs: `{ name: string, costTime?: CompoundValue, costMoney?: CompoundValue }`. Costs are optional so the agent can accept form defaults. No inline `page.evaluate`/`waitForFunction`/`$eval` inside tool files — all browser-side work lives in drivers.

E2E tests under `mcpTools/tests/`: `addProcess.e2e.test.ts`, `editProcess.e2e.test.ts`, `deleteProcess.e2e.test.ts`. Each covers click and shortcut variants and asserts the resulting graph state (node + edges).

## Status notes

Implemented. Decisions made during build:

- Focus shortcut bound to `Ctrl+Alt+R` (R for pRocessos). `Ctrl+Alt+P` was already taken by `openGarmentDetails`.
- Within the Processes list, list-scoped shortcuts: `a` add, `e` edit focused, `d` delete focused, `ArrowDown`/`ArrowUp` cycle. All paired with `ShortcutHint`.
- `removeProcess` is a thin wrapper around `graph.actions.removeNode` — the graph reducer already removes all edges anchored on the deleted node, so no manual `HAS_PROCESS`/`PROCESS_OF`/`CONSUMES` cleanup is needed.
- MCP add/edit tool cost inputs accept `{ quotientAmount?, dividendAmount? }` for `costTime` and `costMoney`. Units stay at form defaults (unitário/minuto for time, reais/unitário for money) — driving the MUI `Select` from puppeteer adds complexity without clear value for the common cases.

## Security

None. All new surface is local UI + an MCP server that already exposes equivalent capabilities for other node types; no new auth boundary, no new data exposure, no new input sinks beyond what the existing add/edit forms already accept.

## Performance

None expected. The new tools and drivers are user-driven, single-shot interactions. `removeProcess` does an O(E) scan of edges in the active variation graph to drop consumption edges anchored on the deleted process — same cost as the existing `removeGraduation` / `removeMaterial` paths. No hot-path or render-cost impact.
