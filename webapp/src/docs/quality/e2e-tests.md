# E2E test rules

Rules for authoring and maintaining e2e tests in the Klippel webapp. These apply to every `*.e2e.test.ts` under `webapp/src/**` and every Puppeteer driver they call.

This is normative. New tests must follow every rule that applies; existing tests that violate a rule should be brought into compliance when touched.

---

## 1. File layout

- **Test files** live next to the MCP tool they exercise: `mcpTools/tests/<feature>.e2e.test.ts`. One file covers both the click and shortcut variants of a feature (one `describe` block per variant).
- **Drivers** live next to the React component they drive, under `drivers/`:
  - `drivers/<Component>.click.puppeteer.ts` — DOM-click flows.
  - `drivers/<Component>.shortcut.puppeteer.ts` — keyboard-shortcut flows.
- **Helpers shared across modules** live under `webapp/src/helpers/puppeteer/` (e.g. `closeOverlays.ts`, `resetWorkspace.ts`).
- Every driver file starts with `/* istanbul ignore file */` so coverage instrumentation does not rewrite the function bodies puppeteer serializes into the browser.

## 2. Selectors

- Prefer **stable attributes** over CSS structure: `data-testid`, `data-<entity>-label`, `id`, `role`, `aria-*`. Never select by Tailwind/MUI class names or by deep child positions.
- Selectors that target a row by its domain identity use a `data-<entity>-label` mirror, e.g. `[data-testid="material-item"][data-material-label="X"]`. Add the mirror to the component if it is missing — do not query by visible text.
- When a wait predicate cannot be expressed as a selector against existing DOM, **add a mirror attribute to the component** rather than polling state from inside `waitForFunction`. Examples in this repo: `data-process-time-status="computed|pending"` on ProcessTime rows, `data-elective-label` on the ProcessItem elective chip.
- Use `:focus`, `:checked`, `:not(:disabled)`, `[aria-expanded="true"]` and friends to express state in a selector — these compose cleanly with `page.waitForSelector`.

## 3. Waits — no fixed timeouts

- **Use `page.waitForSelector` for state waits.** Combine it with `:focus`, `:checked`, `:not([disabled])`, `[aria-expanded="true"]`, the `{ hidden: true }` option, or the `{ visible: true }` option to express what you are waiting for.
- **Do not pass `timeout:` to `waitForSelector` or `waitForFunction`.** Rely on puppeteer's suite-wide default (configured globally). Per-call timeouts mask real latency and turn flakes into mystery failures.
- **`waitForFunction` is the last resort.** Only use it when the predicate cannot be expressed as a selector (e.g. "this DOM subtree contains ≥3 of element A AND ≥2 of element B"). Even then, do not pass a `timeout`.
- **Do not sleep.** No `await new Promise(r => setTimeout(r, N))`, no `page.waitForTimeout(N)`. If you are tempted to sleep, you are waiting for state — add a selector or attribute that reflects that state.
- **`page.click` already waits for the element.** Do not add a redundant `waitForSelector` immediately before a `click` unless the click target is distinct from a previously-asserted element.
- Bounded feature detection (e.g. "is this listbox open?") may use a short `waitForSelector` timeout via `.catch(() => {})`. This is the only allowed exception; document the intent in a comment.

## 4. Test isolation

Every test file shares the same renderer page across `it` blocks, so state from one test bleeds into the next unless explicitly cleared.

- **`beforeAll`** does the workspace-level reset via `resetWorkspace(page, '<unique-workspace-name>')` from `@helpers/puppeteer/resetWorkspace`. This wipes the workspace folder, rewrites the Store pointer, and reloads the page. Use a per-file workspace name; never share workspaces between files.
- **`afterAll`** disconnects the browser and calls `cleanupWorkspace('<same-name>')`.
- **`beforeEach`** calls `resetUIState(page)` from `@helpers/puppeteer/closeOverlays`. This drains every open pointer panel / listbox / overlay, blurs any focused input, and waits for the panel-content to settle. Without it, the second `it` in a file inherits the first's residual focus, half-closed listboxes, and pointer-panel-portal DOM.
- Tests are responsible for their own teardown of created entities inside the `it` body when subsequent tests assume an empty list. Prefer a fresh model per test over inter-test entity cleanup.
- Do not `bringToFront`, `bringToFocus`, or otherwise touch global page state in `beforeAll` other than what `resetWorkspace` already does.

## 5. Drivers — interaction patterns

### Clicks

- `page.click(selector)` is the default. It performs a hit-test through the layout, which is what we want for verifying production click behavior.
- **Use `page.evaluate((sel) => el.click())` (programmatic click)** when:
  - A MUI `Tooltip` wraps a `PointerContainer` trigger and the synthetic event bubbling chain swallows the `onClick`. (Documented in `ProcessElectiveButton.click.puppeteer.ts` and `ProcessMaterialUsageButton.click.puppeteer.ts`.)
  - A still-mounted MUI `Modal` portal from a closed `PointerContainer` (`keepMounted={true}`) intercepts the hit-test. The Visualization driver uses programmatic click in its retry loop for this reason.
- Never use `page.$eval((el) => el.click())` to bypass disabled-button validation. Programmatic click is for hit-test bypass, not for ignoring the disabled state.

### Keyboard

- Drive shortcuts via `page.keyboard.down/press/up`. The shortcut variant of a tool must not import any `*.click.puppeteer.ts` driver — otherwise the click and shortcut paths are not genuinely different.
- Every shortcut registered with the keyboard manager must ship paired with a visible `ShortcutHint` on the actionable control (per CLAUDE.md). The shortcut driver test exercises the binding, but the hint is the discoverability contract.

### Inputs

- `page.type(sel, value)` after a focus + select-all + delete sequence. MUI's multiline `TextField` renders an aria-hidden second `<textarea>` for measuring — when targeting these, filter by `[aria-hidden="true"] !== 'true' && !hasAttribute('readonly')` in an `evaluate` step before typing.
- For MUI `Switch` inputs: `focus()` the `input[type="checkbox"]` then `keyboard.press('Space')`. Clicking the input is intercepted by the visible track because the input has `pointer-events: none`.

### Pointer panels

- Open: click trigger, then `waitForSelector('[role="pointer-panel-content"] [data-testid="<form-id>"]')`. If a Tooltip or stacked Modal swallows the click, use programmatic click and `resetUIState` per Section 4.
- Confirm: click the action button (or `confirmPointerPanel` / `confirmPointerPanelShortcut`), then `waitForSelector('[role="pointer-panel-content"]', { hidden: true })`.
- Close: `Escape` (or `closePointerPanel*`). The PointerContainer Modal ignores MUI's `escapeKeyDown` — Escape is routed through the keyboard shortcut handler, which gives correct precedence over open listboxes and focused inputs.

## 6. MCP tool files — no inline browser code

- **MCP tool files (`mcpTools/*.ts`) must not contain `page.evaluate`, `page.$eval`, `page.$$eval`, or `page.waitForFunction` with inline callbacks.** Istanbul instruments these tool files with coverage hooks (`cov_*` calls inside the serialized function body), which break when puppeteer serializes them to the browser.
- Put any inline-evaluated code in a driver file (which is marked `/* istanbul ignore file */`) and re-export a typed function for the tool to call.

## 7. Environment

- E2E tests connect to a live Electron dev app over CDP at `localhost:${KLIPPEL_CDP_PORT ?? 9222}`. The app must already be running — `npm run test:e2e` does not start it.
- The Jest scripts already prepend `unset ELECTRON_RUN_AS_NODE`. Do not remove this: VS Code's integrated terminal can leak that env var, which makes Electron boot as plain Node, leaves `app.isPackaged` undefined, and surfaces as a CDP-timeout that looks unrelated.
- `BASE_WORKSPACE` and `ENV_NAME` default to `empty` and `benchmark` respectively. Pass `BASE_WORKSPACE=<name>` when a test needs preloaded state.
- The test environment hosts a real renderer; you cannot run e2e tests in CI without a display server. Use the `test:e2e:headless` script (sets `KLIPPEL_USE_XVFB=1`) for headless runs.

## 8. Test shape

- Each `it` block exercises **one observable outcome**. Use `describe` to group click vs. shortcut variants.
- Set a generous per-`it` timeout (e.g. `60_000`–`90_000`) — this is the only timeout you should set, and it bounds the whole test, not a polling window inside it.
- Inside the body, do not assert on intermediate UI state unless it is genuinely the contract you are testing; assert on the final outcome (row appeared, panel closed, value persisted).
- Wrap any "cleanup" tool calls (e.g. delete-the-thing-we-created) in `.catch(() => {})` so a primary-assertion failure is not buried by a cleanup error.

## 9. What you cannot test

Document and skip the case rather than working around it:

- Visual diffs (theme, layout, color) — there is no screenshot harness.
- Animations and transitions — assert the post-transition state via attribute, not via timing.
- Cross-tab/window behavior — every test runs against a single renderer page.

## 10. Authoring checklist

Before opening a PR:

- [ ] Driver lives next to the component; file starts with `/* istanbul ignore file */`.
- [ ] No `timeout:` override on any `waitForSelector` / `waitForFunction` call (except the documented bounded-feature-detection exception).
- [ ] No `setTimeout` / `waitForTimeout` sleeps.
- [ ] All waits use selectors or `:focus` / `:checked` / `[aria-*]` state where possible.
- [ ] New domain selectors use `data-*` mirrors on the component, not text content or class names.
- [ ] `beforeAll` calls `resetWorkspace`; `beforeEach` calls `resetUIState`; `afterAll` calls `cleanupWorkspace`.
- [ ] The MCP tool file imports drivers; it contains no inline browser callbacks.
- [ ] If shortcut: the file does not import any `*.click.puppeteer.ts` driver.
- [ ] Every new keyboard shortcut ships with a visible `ShortcutHint`.

---

## Reference

- `webapp/src/helpers/puppeteer/closeOverlays.ts` — `closeOpenOverlays`, `resetUIState`.
- `webapp/src/helpers/puppeteer/resetWorkspace.ts` — `resetWorkspace`, `cleanupWorkspace`, `softResetWorkspace`.
- `webapp/src/kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer.ts` — `confirmPointerPanel`, `closePointerPanel`, drag helpers.
- `webapp/src/docs/mcp-server.md` — MCP server architecture and tool registration.
- `webapp/src/docs/mcp-tool-reuse.md` — paired tool patterns.
- `webapp/src/system/modules/Composer/docs/changes/2026-05-15-e32e37-replace-test-timeouts-with-waits.md` — rationale for the no-fixed-timeouts rule.
