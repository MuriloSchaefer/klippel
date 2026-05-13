---
id: 2026-05-12-ef620b
name: Link-material shortcut on process item + material cost audit shortcut
description: Add a keyboard shortcut and MCP tool to bind a process to a material (mirroring the elective wiring), plus a shortcut/tool that opens the existing MaterialCostAuditContent panel for a focused material row.
status: draft
modules: [Composer]
---

## Context

The Processes accordion already has list-scoped shortcuts for add/edit/delete (`2026-05-11-489951`) and `w` for linking to an elective (`2026-05-11-8fffd9`). Two related gaps remain, both reachable today only via mouse:

1. The "link material" action on a process row (`ProcessMaterialUsageButton`) — needs the same keyboard parity as `linkElective`.
2. The material cost audit panel — already rendered by `MaterialCostAuditContent` and opened via the `FactCheckOutlined` `IconButton` at `ShowMaterial.tsx:117-138`. Authors need a focused-row shortcut to open it when verifying a consumption/cost number.

Both surfaces live inside Composer's `ProcessListAccordion` / `MaterialListAccordion`, so the change is scoped to this module.

## Change

### 1. Link material from focused process row

UI (`webapp/src/system/modules/Composer/components/viewports/ProcessListAccordion/`):

- `processMaterialUsageButton.tsx`: add `data-testid="process-item-link-material"` to the trigger `IconButton`, accept an `isFocused` prop, render `ShortcutHint` (placement `top-center`, `alwaysShow={isFocused}`) bound to `Composer/ProcessItem/linkMaterial`. Per CLAUDE.md the shortcut ships with a visible hint.
- `ProcessItem.tsx`: thread `isFocused` into `<ProcessMaterialUsageButton />` (mirror the `ProcessElectiveButton` wiring at `ProcessItem.tsx:261`).

Shortcut registration (`webapp/src/system/modules/Composer/kernelCalls.ts`):

- New entry in the `PROCESS_LIST_CONTEXT_ID` block, alongside the existing `w` (linkElective):
  - `id: ${MODULE_NAME}/ProcessItem/linkMaterial`
  - `key`: TBD (candidate: `m` for "material" — confirm no collision inside `PROCESS_LIST_CONTEXT_ID`)
  - `action`: `document.activeElement?.closest('[data-testid="process-item"]')?.querySelector('[data-testid="process-item-link-material"]')?.click()`
  - `description`: `Link focused process to material`

Drivers + MCP tool:

- `processMaterialUsageButton.click.puppeteer.ts` — `clickProcessLinkMaterial(processLabel, materialLabel, amount)`: locate the process row by `[data-process-label]`, click `[data-testid="process-item-link-material"]`, wait for the usage panel, drive the material picker by `materialLabel`, enter `amount`, confirm, wait for panel dismissal.
- `processMaterialUsageButton.shortcut.puppeteer.ts` — `triggerLinkMaterialFromFocused()`, `selectLinkMaterialOptionByKeyboard(materialLabel)`, `submitLinkMaterialFromFocused()`. Per-graduation overrides reuse the same DOM testids the click driver owns; helpers focus inputs via `data-testid` lookups (no `page.click`).
- Per-graduation testids added on the form: `link-material-grade-accordion`, `link-material-grade-row` (with `data-graduation-label`), `link-material-grade-switch`, `link-material-grade-consumption`.
- `linkProcessMaterial.ts` + `linkProcessMaterialShortcut.ts` MCP tools — input `{ processLabel: string, materialLabel: string, consumptionPerGrade?: Record<graduationLabel, quotientAmount> }`. When `consumptionPerGrade` is provided, the tool expands the inner "Consumo por graduação" accordion, toggles the override switch on each requested graduation row, and types the quotient amount into the per-grade `CompoundSelector` before confirming. Tools delegate browser work to drivers (no inline `page.evaluate`). Register in `mcpTools/index.ts`.

E2E test (`mcpTools/tests/linkProcessMaterial.e2e.test.ts`):

- Boot the renderer, switch to Compositor, create + open a model, open garment details (mirror `deleteProcess.e2e.test.ts:33-53`).
- Add a material via `addMaterialTool` (e.g. label `LinkMatE2E`).
- Add a process via `addProcessTool` (e.g. label `LinkE2E`).
- Run `linkProcessMaterialTool` with `{ processLabel: 'LinkE2E', materialLabel: 'LinkMatE2E' }`.
- Assertion: in the **MaterialListAccordion**, the row for `LinkMatE2E` shows consumption for the linked process (read `[data-testid="material-cost-info"]` and assert it is no longer the empty-state `não utilizado`). This proves the link is wired through the graph, not just the UI panel state.
- Repeat for the shortcut variant via `linkProcessMaterialShortcutTool`.

Per-graduation scenario (covers cost varying per graduation):

- Seed two graduations via `addGraduationsTool` (e.g. `P`, `G`) before adding the process. The inner "Consumo por graduação" accordion only renders when graduations exist.
- Add the material + process, then run `linkProcessMaterialTool` with `consumptionPerGrade: { P: 2, G: 5 }` (and the shortcut variant for the shortcut block).
- Open the audit panel via `openMaterialAuditLogTool` and assert the rendered text contains a per-graduation breakdown line for each graduation label (the panel renders `step.graduationBreakdown` rows tagged with the graduation label, the consumption value, and the contribution).

### 2. Open material cost audit from focused material row

UI (`webapp/src/system/modules/Composer/components/viewports/MaterialListAccordion/components/ShowMaterial.tsx`):

- Add `data-testid="material-item-audit-log"` to the existing `FactCheckOutlined` `IconButton` at `ShowMaterial.tsx:128-137`.
- Derive an `isFocused` signal for the material row and render a `ShortcutHint` (placement `top-center`, `alwaysShow={isFocused}`) bound to `Composer/MaterialItem/openAuditLog`. CLAUDE.md hint pairing rule applies.
- No changes to `MaterialCostAuditContent.tsx` — the existing panel is the open target.

Shortcut registration:

- Register in the material-list scoped context (extend the existing block if present, otherwise add a `MATERIAL_LIST_CONTEXT_ID` block in `Composer/kernelCalls.ts`):
  - `id: ${MODULE_NAME}/MaterialItem/openAuditLog`
  - `key`: TBD (candidate: `l` for "log"; confirm no collision in material-list context)
  - `action`: `document.activeElement?.closest('[data-testid="material-item"]')?.querySelector('[data-testid="material-item-audit-log"]')?.click()`
  - `description`: `Open cost audit for focused material`

Drivers + MCP tool:

- `ShowMaterial.click.puppeteer.ts` — `clickMaterialAuditLog(materialLabel)`: locate the row by `[data-material-label]`, click `[data-testid="material-item-audit-log"]`, wait for the `MaterialCostAuditContent` panel selector, return the rendered audit text.
- `ShowMaterial.shortcut.puppeteer.ts` — `triggerOpenAuditLogOnFocused(materialLabel)`: focus the row, dispatch the registered key, await/scrape the same panel.
- `openMaterialAuditLog.ts` + `openMaterialAuditLogShortcut.ts` MCP tools — input `{ materialLabel: string }`, output `{ entries: string[] }` (or similar serialization of the panel content). No inline `page.evaluate` in tool files. Register in `mcpTools/index.ts`.

E2E coverage:

- Standalone click + shortcut tests seed a material, open the audit, and assert returned entries include the expected lines (e.g. the create entry).
- The link e2e above can be extended to also call `openMaterialAuditLogTool` after the link, asserting the audit reflects the new consumption from the linked process.

## Status notes

Draft. Open decisions:

- Key for `linkMaterial`: leaning `m`. Verify no collision in `PROCESS_LIST_CONTEXT_ID` and global contexts.
- Key for `openAuditLog`: leaning `l`. Verify no clash in material-list context.
- Whether the link tool should also accept `consumptionPerGrade` directly. Default to `amount` only for v1; extend later.
- Assertion shape on the material row: human-readable consumption text vs. a hidden `data-consumption` attribute. Prefer the latter if rendered text varies with locale.
- Audit tool output shape: serialized text vs. structured entries. Default to text scraped from the existing panel — keeps the tool decoupled from internal audit structure.

## Security

None. Both surfaces are pure UI keybindings over existing local actions; no new data, auth, or input surface.

## Performance

None. Two `registerShortcuts` entries and one extra `ShortcutHint` per visible process / material row — same cost as the existing edit/delete/linkElective hints.
