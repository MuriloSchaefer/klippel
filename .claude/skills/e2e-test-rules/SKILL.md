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

- No `timeout:` overrides on `waitForSelector` / `waitForFunction`. No `setTimeout` / `waitForTimeout` sleeps.
- Drivers start with `/* istanbul ignore file */`. MCP tool files (`mcpTools/*.ts`) contain no inline browser callbacks — put them in a driver.
- Shortcut variants must not import any `*.click.puppeteer.ts` driver.
- Every shortcut ships with a visible `ShortcutHint` (per project CLAUDE.md).
- Prefer `:focus` / `:checked` / `[aria-*]` / `:not(:disabled)` selectors over `waitForFunction` polling DOM state.

## When to update the doc

If you introduce a new convention or discover a new failure mode that isn't covered, update `webapp/src/docs/quality/e2e-tests.md` in the same PR. The skill is a pointer; the doc is the canon.
