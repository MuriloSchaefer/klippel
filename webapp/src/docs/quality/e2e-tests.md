# E2E test rules

Rules for authoring and maintaining e2e tests in the Klippel webapp. These apply to every `*.e2e.test.ts` under `webapp/src/**` and every Puppeteer driver they call.

This is normative. New tests must follow every rule that applies; existing tests that violate a rule should be brought into compliance when touched.

---

## 1. File layout

E2E tests live in each module's own `tests/` folder, organized first by **collaboration scope** and then by **category**. Tests do **not** live next to the MCP tool or component they exercise — only drivers do.

```
<module>/tests/
  collaborative/         # exercises multi-instance / multi-peer Jazz behavior
    functionality/       # primary behavioral tests under collaboration
    persistence/
      session-management/  # lease/lock/identity lifecycle across peers
      jazz/                # CoValue sync, conflict resolution, content trust
    integrity/           # cross-peer invariants, symmetry, idempotence
    performance/         # latency / throughput budgets under collaboration
    security/            # auth, sanitization, capability boundaries across peers
  standalone/            # single-instance, no live peers
    functionality/       # default home for click + shortcut feature tests
    persistence/
      session-management/  # workspace open/close, single-writer lock, WAL
      jazz/                # SQLite-backed Jazz round-trip, local rehydrate
    integrity/           # round-trip symmetry, invariants on local state
    performance/
    security/            # input sanitization, sandboxing, secrets handling
```

Rules:

- **Test files** live under the module's `tests/<scope>/<category>[/<subcategory>]/` directory: `<module>/tests/standalone/functionality/<feature>.e2e.test.ts`. One file still covers both the click and shortcut variants of a feature (one `describe` block per variant).
- **Pick `collaborative` vs `standalone` by what the test exercises**, not by what the module supports. A test is `collaborative` only if it spins up — or asserts behavior against — more than one Jazz peer / Electron instance, or a real sync server. Otherwise it is `standalone`, even if the underlying code path goes through Jazz.
- **Pick the category by the failure mode the test guards against:**
  - `functionality` — "does the feature do what it claims" (default).
  - `persistence/session-management` — workspace lifecycle, single-writer locks, lease acquire/renew/release, identity handoff.
  - `persistence/jazz` — CoValue durability, SQLite-backed rehydrate, sync convergence, content trust on load.
  - `integrity` — round-trip symmetry, idempotence, derived-value invariants that must hold regardless of path taken.
  - `performance` — assertions on time / memory / payload-size budgets. A test that merely happens to be slow is not a performance test.
  - `security` — sanitization (SVG `<script>` strip, etc.), auth/permission rejection, capability boundaries.
- **One file, one category.** If a feature genuinely needs two angles (e.g. functionality + security), split into two files in two folders, not one file with mixed `describe`s.
- **Drivers** live next to the React component they drive, under `drivers/`:
  - `drivers/<Component>.click.puppeteer.ts` — DOM-click flows.
  - `drivers/<Component>.shortcut.puppeteer.ts` — keyboard-shortcut flows.
- **Helpers shared across modules** live under `webapp/src/helpers/puppeteer/` (e.g. `closeOverlays.ts`, `resetWorkspace.ts`).
- Every driver file starts with `/* istanbul ignore file */` so coverage instrumentation does not rewrite the function bodies puppeteer serializes into the browser.
- Do **not** create `mcpTools/tests/` or co-locate `*.e2e.test.ts` next to source files. Legacy locations are being migrated — see the change plan at `webapp/src/system/modules/Composer/docs/changes/` (`reorganize-e2e-tests-by-scope-and-category`).

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

- [ ] Test file lives under `<module>/tests/<collaborative|standalone>/<category>[/<subcategory>]/`; scope and category match the test's actual failure mode.
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

## 11. Performance tests

Performance tests live under `<module>/tests/<scope>/performance/` and assert against a **declared time / memory / payload budget** (per Section 1, a test that merely happens to be slow is not a performance test). They inherit every rule above — no fixed timeouts, `data-*` mirrors for waits, `resetWorkspace`/`resetUIState` isolation — plus the rules in this section. The rationale and the options trade-off that produced these rules is [src/docs/analysis/performance-tests.md](../analysis/performance-tests.md); this section is the normative distillation.

### 11.1 Budgets are mandatory and recorded

- Every perf `it` asserts a **named budget** (e.g. cold-open p95 < 800 ms at 1k materials). A perf test with no numeric assertion is not allowed — it cannot catch slow degradation inside a pass.
- Append one machine-readable record per measured outcome to a JSON artifact under `webapp/.tests-executions/` (sibling to the run logs): `{ surface, cardinality, peers, metric, value, p50, p95, hardware }`. Numbers are **trended**, not just pass/failed.
- Budget thresholds are calibrated from a first reference run; record the hardware in the artifact. Do not hard-code a number you have not measured at least once.

### 11.2 Cardinality tiers drive the seeding path

The workload size dictates how you get the workspace into state. **Do not** use one mechanism for all sizes — the bulk-seed IPC and full-snapshot assertions both break past ~1k.

| Tier | Seed | Storage / setup | Assertion read |
| --- | --- | --- | --- |
| ≤ 1k | live `seed` IPC (`window.electron.jazz.materials.seed`) | live seed in `beforeAll`, or `cpSync` from a materialized base | full snapshot `load()` acceptable |
| 10k | **batched** seed (chunked) or direct-SQLite, materialized once | `cpSync` from a `BASE_WORKSPACE` base (Option 3) | targeted by-id lookup; avoid full snapshot |
| 100k | **direct-SQLite, out of band** — single bulk IPC is infeasible (blocks/OOMs main) | `cpSync` from a hash-keyed cached base; **never commit the built DB** | **must** use by-id lookup + count mirror; full `load()` is itself O(N) |

- At **≥ 10k you must use the materialize-once + `cpSync` pattern** (a `pretest:perf` step seeds the base; tests copy it). Re-seeding 100k every run would dominate the measurement.
- Commit the **seed manifest + generator + a content hash**, not the built workspace bytes (a 100k catalog with SVG blobs is hundreds of MiB). The `pretest:perf` step rebuilds the base only when the hash changes and **fails loudly on a stale cache**.

### 11.3 Address data deterministically — never scan to discover it

A perf test must **derive** its target a priori, never scan the catalog to find a name/id. This is what keeps a 100k-row test deterministic and fast.

- **Index-derived identities.** The generator is PRNG-seeded and identities are functions of the row index: material `i` → `id = mat-{seed}-{i}`, `label = "Material {i}"`, type `type-{i % T}@0.0.1`. Human-looking names come from a fixed dictionary cycled by index. A test computes `mat-{seed}-0` or `mat-{seed}-{count/2}`; it does not look one up.
- **Planted probe rows.** Inject known, uniquely-labeled needles (`__probe_search__`, `__probe_edit__`, `__probe_delete__`) the dictionary never emits. Search/edit/delete tests target those — unique by construction, known a priori, independent of the random bulk.
- **Index sidecar.** The generator emits a tiny `{ seed, count, types, probes, firstId, lastId, sampleIds }` table-of-contents next to the manifest. Tests read that, not the bulk catalog, to learn what is in the fixture.

### 11.4 Assertions must be O(1), not O(N)

- **Verify a single entity via a by-id lookup IPC** (`materials.get(id)`), not the full-catalog `load()` snapshot — `jazz-materials-load` structured-clones the whole catalog on every call ([Materials/main/index.ts](../../system/modules/Materials/main/index.ts)), so a full-snapshot assertion times the clone, not the surface, at scale. If the by-id IPC does not exist yet, add it (it is also the production lazy-load pattern) before writing a > 10k test.
- **Wait on the DataGrid count mirror** (a `data-*` row-count attribute on `SummaryBar` / `MaterialStockViewport`) for "catalog reached N rows" — a single selector wait, not a `waitForFunction` snapshot scan. Add the mirror if absent (per Section 2).
- The collaborative convergence surface (peer B reflects peer A) uses the same by-id lookup, not `waitForCatalogIPC`'s full `load()`, above the tier where a full snapshot is affordable.

### 11.5 Shared primitives (build once, reuse)

- `webapp/src/helpers/puppeteer/generateMaterialsCatalog.ts` — pure, PRNG-seeded `(opts) => SeedCatalogInput`. Emits index-derived ids, planted probes, the index sidecar, and a realistic `conformsTo` / `manufacturedBy` edge graph with representative blob/`composition` sizes. No `page` dependency.
- `webapp/src/helpers/puppeteer/seedSyntheticMaterials.ts` — drives the tier-appropriate seed path, asserts `seeded === true`, and waits on the count mirror. This is the only seeding entry point a perf test calls.
- Standalone tests: `catalogColdOpen` (S1), `listInteraction` (S2/S3). Collaborative: `catalogConvergence` (S6), parameterized over peer count.

---

## Reference

- `webapp/src/helpers/puppeteer/closeOverlays.ts` — `closeOpenOverlays`, `resetUIState`.
- `webapp/src/helpers/puppeteer/resetWorkspace.ts` — `resetWorkspace`, `cleanupWorkspace`, `softResetWorkspace`.
- `webapp/src/kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer.ts` — `confirmPointerPanel`, `closePointerPanel`, drag helpers.
- `webapp/src/docs/mcp-server.md` — MCP server architecture and tool registration.
- `webapp/src/docs/mcp-tool-reuse.md` — paired tool patterns.
- `webapp/src/system/modules/Composer/docs/changes/2026-05-15-e32e37-replace-test-timeouts-with-waits.md` — rationale for the no-fixed-timeouts rule.
- `webapp/src/docs/analysis/performance-tests.md` — performance-suite options analysis (fixtures vs. seeding vs. hybrid), tiering, and data-addressability rationale behind Section 11.
