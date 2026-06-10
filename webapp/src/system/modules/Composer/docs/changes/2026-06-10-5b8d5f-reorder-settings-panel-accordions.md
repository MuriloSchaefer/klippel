---
id: 2026-06-10-5b8d5f
name: Reorder settings-panel accordions
description: Reorder the ModelViewport settings panel and promote Electives to a variation-wide accordion.
status: implemented
modules: [Composer]
---

## Context

The settings panel in `ModelViewport` lists its accordions in an order that no
longer matches how the panel is used. The desired order is:

1. Composition tree
2. Materials
3. Electives
4. Logos
5. Process cost (the time-per-process accordion, "Tempo")
6. Money cost (the money-per-process accordion, "Custo")

Two structural facts drive the work:

- **Electives are not in the settings panel today.** `ElectiveListAccordion`
  renders inside the per-part **Details panel** (`GarmentDetails`), scoped to the
  currently selected part via `garmentId={selectedPart}`. The new order requires
  it to live in the settings panel and show electives for the whole variation.
- **The terms "processCost" / "money cost" map to existing accordions** —
  `ProcessTimeAccordion` ("Tempo") and `ProcessCostAccordion` ("Custo")
  respectively. No new accordion is created; nothing is removed.

Note: `focusElectiveList` (mcpTool) already calls `ensureSettingsPanelExpanded`,
so it already assumes the Eletivos accordion lives in the settings panel. Moving
it there resolves that latent inconsistency rather than introducing one.

## Change

### 1. Reorder the settings panel — `components/viewports/ModelViewport/index.tsx`

Reorder the children of `<SettingsPanel>` to:

1. `Composição` (CompositionTree) — unchanged
2. `Materiais` (MaterialListAccordion) — unchanged
3. **`Eletivos`** (ElectiveListAccordion) — **new entry**, see §2
4. `Logos` (LogoListAccordion) — moved up
5. `Tempo` (ProcessTimeAccordion) = "processCost" — moved down
6. `Custo` (ProcessCostAccordion) = "money cost" — moved down

The Eletivos accordion keeps its `FocusShortcutProvider contextId={ELECTIVE_LIST_CONTEXT_ID}`
and `shortcutHint={`${MODULE_NAME}/ElectiveList/focus`}`, moved here from
`GarmentDetails`. Per CLAUDE.md, the focus shortcut must keep its visible
`ShortcutHint` — it already does via the `shortcutHint` prop on `<Accordion>`.

### 2. Make `ElectiveListAccordion` variation-wide — `components/viewports/ElectiveListAccordion/`

Today the selector filters edges by `sourceId === garmentId && type === "HAS_ELECTIVE"`
and `AddElectiveButton` attaches a new elective via
`addElective(name, garmentId, defaultValue)`.

**Electives only ever link to the root `"garment"` node** (sub-parts are not yet
designed), so "variation-wide" and "garment-scoped" coincide today — there is no
ambiguity about which part owns an elective or which part a new one attaches to.

- **Listing:** keep filtering `HAS_ELECTIVE` edges, with the source fixed to the
  root `"garment"` node (equivalently, gather all `HAS_ELECTIVE` edges — same set).
  `ElectiveItem` already needs only `variationId`, so item rendering is unchanged.
- **Add target:** the new elective attaches to the root node id `"garment"`
  (created in `store/models/middlewares.ts`, the default `selectedPart`).
- **Props:** drop the required `garmentId` prop on `ElectiveListAccordion` /
  `AddElectiveButton` and hardcode the root `"garment"` id internally, so the
  settings-panel call site passes only `variationId`. Revisit the prop if/when
  sub-part electives are designed.

### 3. Remove Electives from the Details panel — `components/viewports/ModelViewport/DetailPanel/GarmentDetails.tsx`

Delete the `Eletivos da Peça` `Accordion` + its `FocusShortcutProvider`
(`ELECTIVE_LIST_CONTEXT_ID`) and the `ElectiveListAccordion` import. The
remaining Details accordions (Detalhes, Graduações, Visualização, Processos) are
untouched.

### 4. Update e2e drivers / tests for the new location

Elective tests assume the Details-panel location and a selected part. Affected:

- `tests/standalone/functionality/{addElective,editElective,deleteElective,linkProcessElective}.e2e.test.ts`
- `tests/standalone/functionality/electiveGate.e2e.test.ts`
- `ElectiveListAccordion/drivers/*.puppeteer.ts` and the
  `ElectiveItem.shortcut.puppeteer` helpers used by `focusElectiveList`

Drivers that open `GarmentDetails` / select a part before reaching the elective
list should instead expand the settings panel and the Eletivos accordion.
`focusElectiveList` already targets the settings panel, so its driver path is the
reference. Per the e2e-test-rules skill, replace any added timeouts with
`data-testid` waits; the list root already exposes `data-testid="elective-list"`.

## Status notes

Implemented. `tsc --noEmit` passes.

### e2e fallout — lingering-modal hit-test (resolved)

Promoting `AddElectiveButton` (a `PointerContainer`) into the always-rendered
settings panel added one more `keepMounted` MUI `Modal` portal at `document.body`.
That tipped several drivers that clicked a pointer trigger via coordinate
`page.click` (hit-test) into the documented "still-mounted Modal portal swallows
the click" failure (e2e-tests.md §4) — both elective panels *and* unrelated logo
placement tests went red. Fixed in the previously-unguarded openers with `resetUIState` (clear
any panel a prior step left open) + a programmatic `$eval` `el.click()` (bypasses
the layout hit-test, so a lingering portal can't swallow it — no retry loop
needed):

- `openLogoPlacements` (LogoPlacementsButton driver)
- `openAddElectivePanel` (AddElectiveButton driver)
- `clickEditElective` / `clickDeleteElective` (ElectiveItem driver, via a shared
  `clickRowAction` helper)

Baseline confirmed the logo cluster was green on HEAD, so this was a regression
introduced by the reorder, not a pre-existing flake.

### e2e fallout — collapsed accordion / empty innerText (resolved)

The old per-part Eletivos accordion was `defaultExpanded`; the new settings-panel
one initially was not. Tests that read a row via `$eval(..., el => el.innerText)`
(which returns `""` for non-visible nodes) or that re-check the row after
close+reopen without re-expanding (`modelGraphPersistence`, the `isDefault`
`addElective` cases) saw empty text. Restored `defaultExpanded` on the
settings-panel Eletivos accordion, matching its prior behavior.

The e2e drivers/tests were updated for the new location.
The accordion was renamed "Eletivos da Peça" → "Eletivos", so the shortcut action
in `kernelCalls.ts`, the `ElectiveItem.shortcut` driver selector, and the six
elective mcpTools (`expandAccordion(..., 'Eletivos')`, garment-details step
dropped) were updated to match. The Add target is the `GARMENT_ROOT_ID`
("garment") constant added to `constants.ts`.

Decisions settled with the user:

- Order: composition tree, materials, electives, logos, processCost (Tempo),
  money cost (Custo).
- ProcessTime is **kept** (as "processCost"); nothing removed; no new accordion.
- Electives become **variation-wide** in the settings panel and are **removed**
  from the per-part Details panel.
- Electives only link to the root `"garment"` node (sub-parts not yet designed),
  so the Add target is unambiguous and the `garmentId` prop is dropped. No open
  questions remain.

## Security

None. Pure UI reordering and re-scoping of an existing list within the same
variation graph already loaded client-side; no new data, auth, or input surface.

## Performance

Negligible. The variation-wide elective selector iterates all graph edges instead
of a `garmentId`-filtered subset; electives-per-variation is small. The accordion
is collapsed by default and memoized, so cost is bounded and off the hot path. No
benchmark needed.
