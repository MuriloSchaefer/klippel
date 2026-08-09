---
name: e2e-test-rules
description: Use when authoring, editing, or reviewing Klippel e2e tests (`*.e2e.test.ts`) or their Puppeteer drivers (`*.click.puppeteer.ts` / `*.shortcut.puppeteer.ts`). Triggers include "write an e2e test", "add a driver", "fix a flaky e2e", "review test isolation", "convert a timeout", "add a wait", "add data-testid for a wait", and any change under `webapp/src/helpers/puppeteer/`. The authoritative rules live in `webapp/src/docs/quality/e2e-tests.md` — read that file before writing or reviewing code in scope.
---

# Klippel e2e test rules

The full, normative rule set lives at [webapp/src/docs/quality/e2e-tests.md](../../../webapp/src/docs/quality/e2e-tests.md). Read it whenever you are about to write or review an e2e test or driver — it is the source of truth.

## How to apply this skill

1. **Always open the docs file first.** Skim every section; the rules are short. Do not work from memory of "what tests in this repo usually look like" — the conventions have shifted (notably: no fixed timeouts as of `2026-05-15-e32e37`).
2. **Match the authoring checklist in Section 10** before declaring a test ready. Run through it explicitly; do not infer compliance from "the test passed locally."
3. **When a wait predicate can't be expressed as a selector, add a mirror attribute** to the React component (e.g. `data-process-time-status`, `data-elective-label`) rather than reaching for `waitForFunction`. The doc lists the canonical examples.
4. **Test isolation goes through `resetWorkspace` (beforeAll) and `resetUIState` (beforeEach).** Do not invent ad-hoc cleanup; reuse the helpers in `webapp/src/helpers/puppeteer/`.

## Hard rules (quick reference; full text in the doc)

- Tests live under `<module>/tests/<collaborative|standalone>/<category>[/<subcategory>]/`. **Do not** put `*.e2e.test.ts` under `mcpTools/tests/` or next to source files.
  - `collaborative` only when the test asserts behavior across more than one Jazz peer / Electron instance; otherwise `standalone`.
  - Categories: `functionality` (default), `persistence/session-management`, `persistence/jazz`, `integrity`, `performance`, `security`. One file, one category.
  - **`performance` tests have their own normative rules** (Section 11 of the doc): declared numeric budgets, recorded artifacts, cardinality-tiered seeding, deterministic data addressing. Use the dedicated [performance-tests](../performance-tests/SKILL.md) skill when writing or scaling them.
- No `timeout:` overrides on `waitForSelector` / `waitForFunction`. No `setTimeout` / `waitForTimeout` sleeps.
- Drivers start with `/* istanbul ignore file */`. MCP tool files (`mcpTools/*.ts`) contain no inline browser callbacks — put them in a driver.
- Shortcut variants must not import any `*.click.puppeteer.ts` driver.
- Every shortcut ships with a visible `ShortcutHint` (per project CLAUDE.md).
- Prefer `:focus` / `:checked` / `[aria-*]` / `:not(:disabled)` selectors over `waitForFunction` polling DOM state.
- **When an `id` is reused across instances, the selector must also name the instance (§2).** Only the active viewport renders, so every tab's component carries the same `id` — `#svg-editor` is identical in every `ModelViewport`. Add an instance mirror (`data-variation-id`) and scope to `[role="viewport-content"]`, or the selector cannot tell "this tab renders X" from "some tab does".
- **Assert rendered output when the bug is in rendering (§2).** One instance's paint leaking into another's is invisible to a state-level check — the store was correct for both throughout. Assert the attribute on the element in the mounted viewport, not the value in Redux.
- **In-app viewport tabs are testable (§9).** The "cross-tab is untestable" rule is about *browser* tabs and windows. Viewport tabs live in the one renderer page: switch with `switchViewport` and assert each renders its own state — see `Composer/tests/standalone/integrity/svgTabIsolation.e2e.test.ts`.
- **Seeders are not tests (§13).** `webapp/scripts/seed/*.seed.ts` build demo/benchmark workspaces; jest ignores `<rootDir>/scripts/` and they are reached only by their own npm script. Never name one `*.test.ts`, never put one under a module's `tests/`. Use the [workspace-seeders](../workspace-seeders/SKILL.md) skill.
- **`.session/` is a point-in-time snapshot (§12).** Nothing writes it outside the whole-session save — not reducers, not mutation middlewares. A test that needs state on disk saves it *through the UI* with `saveSessionViaUI`, then waits on `[data-session-saved-at]`. Never dispatch `saveSession`, and never assume a mutation persisted itself.

## When to update the doc

If you introduce a new convention or discover a new failure mode that isn't covered, update `webapp/src/docs/quality/e2e-tests.md` in the same PR. The skill is a pointer; the doc is the canon.

## Related

- [performance-tests](../performance-tests/SKILL.md) — §11, for tests that assert a numeric budget.
- [session-persistence](../session-persistence/SKILL.md) — §12, for the production side of `.session/` (writers, rehydrators, pruning).
- [workspace-seeders](../workspace-seeders/SKILL.md) — §13, for `scripts/seed/*.seed.ts` and their paired `integrity` tests.
- [create-change-documents](../create-change-documents/SKILL.md) — record the convention change alongside the doc edit.
