# Klippel — workspace guidance

## Jazz is (nearly) gone

Storage, querying and sync have **moved** to SQLite + cr-sqlite: the catalog, models, attachments and peer sync all run there (`webapp/electron/main/db/`, `webapp/electron/main/sync/`). Jazz / cojson holds one thing still — workspace *identity*, minted by Share and resolved by Join. **Do not add new Jazz surface**: no new CoValue types, no new fields on `WorkspaceCoMap`, no new `requireCatalog` call sites.

**Why:** cojson re-verifies every transaction on every load, including from local SQLite, and keeps no local snapshot — so opening a `co.record` costs one verification per entry, on every app start, forever. At 2 110 materials that is 2.4 s before a single row can be read; at 10k the warm surfaces are already over budget. Full reasoning and measurements: [webapp/src/docs/jazz-is-dead.md](webapp/src/docs/jazz-is-dead.md).

**How to apply:** Bug fixes in the Jazz layer are fine while it keeps the app usable. New per-workspace UI state goes to `.session/` under the rules below; new domain data goes to the SQLite store — a module owns its DDL as `.sql` beside its main-process code and its queries in `main/queries/`, exported through the module index, never as SQL strings inline in TypeScript. A table that must reach other peers is declared in that module's replicated-tables list, and the constraints a CRR accepts are written at the top of `Materials/main/schema/catalog.sql` — read them before adding a column.

Sync: [p2p-sqlite/overview.md](webapp/electron/main/docs/p2p-sqlite/overview.md) for how two peers converge, [scalability.md](webapp/electron/main/docs/p2p-sqlite/scalability.md) for what it costs and where it does not hold yet. The relay is **trusted** — it reads and could forge every change — so it is run by whoever owns the data. The renderer's mirror contract (`Materials/docs/architecture/catalog-mirror.md`) is unaffected and still applies.

## Keyboard shortcuts

Every keyboard shortcut registered in the webapp must be paired with a visible `ShortcutHint` (from `@kernel/modules/KeyboardShortcuts`) on the corresponding control. No shortcut ships without a hint.

**Why:** Shortcuts must be discoverable by default — hidden bindings create a "secret keys" anti-pattern.

**How to apply:** When registering a shortcut via `keyboardManager.functions.registerShortcuts`, also wrap (or manually render `ShortcutHint` next to) the actionable control. Use the wrapper form by default; fall back to manual hint rendering when wrapping breaks parent layout (per the KeyboardShortcuts skill decision tree).

## Session data is a point-in-time snapshot

Nothing writes to `.session/` except an explicit whole-session save. Never persist from a reducer, and never persist from a mutation middleware — a `createX` / `updateX` / `deleteX` effect changes Redux state and emits its event, and that is all.

**Why:** A session must represent a moment the *user* chose. Saving each change as it happens turns `.session/` into a running log, so "close without saving" silently keeps edits the user never committed, and there is no coherent state to return to.

**How to apply:** Give the module one writer — a `saveSession` path registered with `storage.registerSessionSaveListener` (see `Orders/store/session.ts`). It must **reconcile**, not just append: write every live entity and prune the files of entities that no longer exist, or deletions come back on the next rehydrate. Listeners may be async; `storage.saveSession()` resolves once they have all settled.

E2E tests follow the same rule: a test needing state on disk saves it by driving the UI (`saveSessionViaUI`), never by dispatching `saveSession`. Full rules in [webapp/src/docs/quality/e2e-tests.md](webapp/src/docs/quality/e2e-tests.md) §12, and the how-to in the `session-persistence` skill.

## A viewport tab is an independent component instance

Only the active viewport renders, so two tabs of the same type occupy the same position in the tree. `ViewportLoader` keys the component by viewport name to keep them separate; do not remove that key. Component-local state (`useMemo` caches, refs, d3 behaviours) is therefore **not** guaranteed to survive a tab switch — anything that must persist belongs in the store or in `.session/`.

**Why:** Without the key, React reconciles a tab switch as a prop update on one fiber, and every cache carries across. That leaked one tab's SVG rendering into another's: the editor memoises its parsed document on the content *string*, and two variations of one model hold equal strings.

**How to apply:** Cache per-instance state on an instance key (variation id / instance name), never on content alone. Anything handed out for mutation must not be shared — `useSVGEditor` keeps the parse pristine and paints each render onto a `cloneNode` copy, so a render is a pure function of state. A test asserting rendered output must name the instance (`data-variation-id`), because every tab's editor carries the same `#svg-editor` id. Full write-up: [webapp/src/kernel/modules/Layout/docs/changes/2026-08-08-086940-viewport-tab-instance-isolation.md](webapp/src/kernel/modules/Layout/docs/changes/2026-08-08-086940-viewport-tab-instance-isolation.md).
