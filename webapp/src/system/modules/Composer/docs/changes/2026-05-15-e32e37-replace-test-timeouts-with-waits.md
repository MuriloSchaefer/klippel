---
id: 2026-05-15-e32e37
name: Replace timeout-based waits with selector/predicate waits
description: Remove fixed `{ timeout: N }` polling windows from puppeteer drivers and e2e tests in favor of deterministic `waitForSelector` / attribute-driven `waitForFunction` calls.
status: partially implemented
modules: [Composer, Pointer, Layout]
---

## Context

The new ProcessTime accordion driver flaked under load: `triggerFocusMove` in [ProcessTimeItem.shortcut.puppeteer.ts:53](../../components/viewports/ProcessTimeAccordion/drivers/ProcessTimeItem.shortcut.puppeteer.ts#L53) timed out at 3 s waiting on a `waitForFunction` predicate that polled `document.activeElement`. The failure is symptomatic of a broader pattern across the webapp's puppeteer drivers: synchronization on time budgets rather than on observable DOM state. When the renderer is slow (CI, busy host, parallel tests), the budget is what fails — not the assertion.

Audit count at time of writing: ~49 `waitForFunction` call sites across drivers and e2e tests under `webapp/src`, most paired with hard-coded `timeout:` values. A handful of `waitForSelector` calls also carry short timeouts (e.g. 500 ms) used as feature detection — those are not the target of this change.

## Change

Convert wait-on-state code paths in webapp puppeteer drivers and e2e tests from `waitForFunction({ timeout })` to either:

1. `page.waitForSelector(sel)` against a CSS-visible state (e.g. `[data-testid="process-time-item"]:focus`, `[data-focused-label="X"]`, `[aria-expanded="true"]`). Add stable `data-*` attributes to components when no existing selector captures the predicate.
2. `page.waitForSelector` combined with a follow-up assertion when only the *presence* of an element matters.

When a predicate genuinely cannot be expressed as a selector (rare — e.g. cross-element relational checks), keep `waitForFunction` but drop the `timeout` override and rely on puppeteer's default page timeout configured globally for the suite.

Concrete targets, grouped by module:

**Composer (primary, most occurrences)**

- `ProcessTimeAccordion/drivers/ProcessTimeItem.shortcut.puppeteer.ts` — `triggerFocusProcessTimeList`, `triggerFocusMove`, `focusProcessTimeItem`. Add a `data-focused="true"` mirror attribute on the focused row (or query `:focus` directly) so waits become `waitForSelector('[data-testid="process-time-item"]:focus')` and label transitions become `waitForSelector('[data-testid="process-time-item"][data-process-label="<x>"]:focus')`. **Land this first as the reference pattern.**
- `ProcessListAccordion/drivers/*`, `ElectiveListAccordion/drivers/*`, `MaterialListAccordion/.../drivers/*`, `GraduationListAccordion/drivers/*`, `VisualizationListAccordion/drivers/*`, `ModelViewport/DetailPanel/drivers/GarmentDetails.*`, `OpenModelIconButton/drivers/openModel.puppeteer.ts` — same treatment per driver.
- `mcpTools/tests/uploadVariationSVG.e2e.test.ts` — review the remaining `waitForFunction` and replace with selector waits where possible.

**Pointer (kernel)**

- `PointerContainer.click.puppeteer.ts` / `PointerContainer.shortcut.puppeteer.ts` — wait on `[role="pointer-panel-content"]` presence/absence, drag-handle attributes, and `aria-` state instead of polling inside `waitForFunction`.
- `tests/PointerContainer.drag.e2e.test.ts` — replace assertion-time `waitForFunction` blocks with `waitForSelector` against drag-state attributes. May need a small `data-drag-phase="idle|active|released"` mirror on `PointerContainer` to express mid-drag predicates as selectors.

**Layout (kernel)**

- `Accordion.click.puppeteer.ts` — replace open/close polling with `waitForSelector('[aria-controls="accordion-<name>-content"][aria-expanded="true"]')` (and the inverse for collapse). `aria-expanded` is already on the summary.
- `SettingsPanel.click.puppeteer.ts` — wait on the panel root / mounted state instead of polling. Low risk; can land independently of the ProcessTime reference.

Out of scope for this change:

- `waitForSelector({ timeout })` calls used as bounded feature detection (Materials selectors).
- Global suite-level test timeouts (Jest `it(..., 60_000)`); those bound the whole test, not a polling window.

## Status notes

Partially implemented — sweep landed; awaiting e2e suite re-run to validate.

**Done:**
- Composer drivers across ProcessTime, ProcessList, ProcessTime click + shortcut, MaterialList, EditMaterial, ElectiveList, AddElective, VisualizationList, GraduationList, GarmentDetails (click + shortcut), AddVisualization, openModel.
- Pointer kernel drivers (PointerContainer click + shortcut).
- Layout kernel drivers (Accordion, SettingsPanel).
- New mirror attributes: `data-process-time-status` on ProcessTime rows, `data-elective-label` on the ProcessItem elective chip.
- Visualization cross-test state-leakage hardening: `resetUIState` helper in `closeOverlays.ts`, `beforeEach` on `deleteVisualization.e2e.test.ts`, programmatic-click fallback in `openAddVisualizationPanel`.

**Remaining:**
- `uploadVariationSVG.e2e.test.ts:128` keeps a `waitForFunction` for "≥3 circles AND ≥2 paths AND ≥1 rect inside #svg-editor" — selector cannot express a multi-shape count. Per plan, only the `timeout` override was dropped.
- E2E suite needs to be re-run by the developer (CDP requires the local Electron dev app).

**Open questions:**

1. Should the convention forbid all `timeout:` overrides on `waitForFunction`, or only the short ones (≤5 s) that mask real waits? Recommendation: forbid overrides entirely in drivers; configure a single suite-wide default. Implemented as: all driver-level `timeout` overrides removed.
2. Adding mirror `data-focused` attributes couples components to test selectors. Acceptable in this codebase (drivers already query `data-testid` heavily) but worth confirming.
3. Where attributes already exist (e.g. `aria-expanded`, `aria-selected`), prefer those over new `data-*` to avoid duplication.
4. Sequence: land the ProcessTime conversion first as the reference pattern, then sweep Composer's other drivers, then Pointer, then Layout in follow-up PRs (same change id; status flips to `partially implemented` after the first PR lands and `implemented` once the sweep is done).
5. This doc lives only under Composer's `docs/changes/` even though it covers Pointer and Layout drivers — single source of truth per user request.

## Security

None. The change is test-infrastructure only — no production code paths or auth surfaces are touched. Adding `data-*` attributes to DOM nodes does not expose sensitive data.

## Performance

Net positive for test suite wall-clock time: selector-based waits resolve on the next microtask after the DOM mutates, whereas `waitForFunction` polls on a default interval. Production render cost is unchanged — added `data-*` attributes are static strings and do not affect React reconciliation beyond an extra prop comparison. No benchmarks planned; effect should be visible as reduced CI flake rate and lower mean test duration.
