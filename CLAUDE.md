# Klippel — workspace guidance

## Keyboard shortcuts

Every keyboard shortcut registered in the webapp must be paired with a visible `ShortcutHint` (from `@kernel/modules/KeyboardShortcuts`) on the corresponding control. No shortcut ships without a hint.

**Why:** Shortcuts must be discoverable by default — hidden bindings create a "secret keys" anti-pattern.

**How to apply:** When registering a shortcut via `keyboardManager.functions.registerShortcuts`, also wrap (or manually render `ShortcutHint` next to) the actionable control. Use the wrapper form by default; fall back to manual hint rendering when wrapping breaks parent layout (per the KeyboardShortcuts skill decision tree).
