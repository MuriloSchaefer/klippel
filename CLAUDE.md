# Klippel — workspace guidance

## Keyboard shortcuts

Every keyboard shortcut registered in the webapp must be paired with a visible `ShortcutHint` (from `@kernel/modules/KeyboardShortcuts`) on the corresponding control. No shortcut ships without a hint.

**Why:** Shortcuts must be discoverable by default — hidden bindings create a "secret keys" anti-pattern.

**How to apply:** When registering a shortcut via `keyboardManager.functions.registerShortcuts`, also wrap (or manually render `ShortcutHint` next to) the actionable control. Use the wrapper form by default; fall back to manual hint rendering when wrapping breaks parent layout (per the KeyboardShortcuts skill decision tree).

## Session data is a point-in-time snapshot

Nothing writes to `.session/` except an explicit whole-session save. Never persist from a reducer, and never persist from a mutation middleware — a `createX` / `updateX` / `deleteX` effect changes Redux state and emits its event, and that is all.

**Why:** A session must represent a moment the *user* chose. Saving each change as it happens turns `.session/` into a running log, so "close without saving" silently keeps edits the user never committed, and there is no coherent state to return to.

**How to apply:** Give the module one writer — a `saveSession` path registered with `storage.registerSessionSaveListener` (see `Orders/store/session.ts`). It must **reconcile**, not just append: write every live entity and prune the files of entities that no longer exist, or deletions come back on the next rehydrate. Listeners may be async; `storage.saveSession()` resolves once they have all settled.

E2E tests follow the same rule: a test needing state on disk saves it by driving the UI (`saveSessionViaUI`), never by dispatching `saveSession`. Full rules in [webapp/src/docs/quality/e2e-tests.md](webapp/src/docs/quality/e2e-tests.md) §12.
