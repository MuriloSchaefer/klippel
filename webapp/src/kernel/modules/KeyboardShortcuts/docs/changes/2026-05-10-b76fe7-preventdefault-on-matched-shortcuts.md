---
id: 2026-05-10-b76fe7
name: preventDefault on matched keyboard shortcuts
description: Have KeyboardListener call preventDefault when a keydown matches an enabled shortcut so the browser's implicit Enter/Space activation cannot re-trigger a refocused trigger button after the shortcut closes a modal or container.
status: implemented
modules: [KeyboardShortcuts]
---

## Context

Pressing Enter inside the Open Model modal both confirms the selection and reopens the modal. Trace:

1. Enter `keydown` (window capture) → `KeyboardListener` dispatches `keyPressed` → middleware matches `CONFIRM_MODEL_SELECTION_SHORTCUT_ID` → action clicks `[aria-label="confirm-model-selection"]` → `closeModal()`.
2. `SystemModal` unmounts. MUI's `Modal` restores DOM focus to the previously focused element — the `#open-model-modal` IconButton trigger.
3. The user is still holding Enter. The browser fires `keyup` for Enter on the now-focused button. Per the HTML spec, buttons activate on Enter `keyup` when focused → native `click` runs → `handleOpen` reopens the modal.

The same class of bug threatens any shortcut that closes a panel whose original trigger element is a button (PointerContainer worked around it via `skipRefocus`; SystemModal has no such hatch). The architectural fix is to stop the browser from generating the synthetic activation in the first place by calling `event.preventDefault()` on any shortcut-matched keydown.

## Change

The "is this key a matched shortcut?" lookup already exists: `selectShortcutByKey(key)(state)` in [`store/selectors.ts:106`](../../store/selectors.ts) walks the active context stack and returns the matching shortcut (or `undefined`). The middleware in [`store/middleware.ts:44`](../../store/middleware.ts) uses the exact same selector to decide whether to dispatch the action. We can reuse it from the listener.

In [`components/KeyboardListener.tsx`](../../components/KeyboardListener.tsx):

- After `formatKeyEvent(event)` produces the normalized `key`, read the store via `storeModule.hooks.useStore` (or the existing `useAppSelector` plus a memoized selector instance) and call `selectShortcutByKey(key)(state)`.
- Also check `selectEnabled(state)` and skip the modifier-only keys, mirroring the middleware's gating so we only preventDefault when the middleware will actually fire an action.
- If a shortcut matches, call `event.preventDefault()` *before* dispatching `keyPressed`. This cancels the browser's implicit Enter/Space activation, so when the user releases the key, no synthetic `click` is generated against whichever element happens to be focused at that moment (e.g. a trigger button refocused by MUI's `Modal` after the shortcut closed it).
- Keep the existing OS-shortcut `preventDefault` cases (`Alt+digit`, `Ctrl+W`, `Ctrl+M`, `Ctrl+Alt+letter`) untouched — they fire regardless of whether a shortcut is registered.
- Editable fields are already protected: `shouldIgnoreKeyEvent` short-circuits at the top of `handleKeyDown`, so typing Enter inside `<input>`/`<textarea>` still submits forms / inserts newlines normally.

This keeps both fixes in place:

- **`PointerContainer.skipRefocus`** (already shipped) stays as a per-instance opt-out for callers that explicitly do not want focus restored to their trigger after the container closes — useful even when no shortcut is involved.
- **The new `preventDefault` in the listener** removes the bug class globally: any shortcut that closes a panel and triggers MUI focus restoration to a button no longer suffers the Enter-keyup re-activation, including `SystemModal` consumers (Open Model) which have no `skipRefocus` equivalent.

Effect: pressing Enter in the Open Model modal closes it once and stops there. The same protection applies automatically to every other shortcut-driven close.

## Status notes

Implemented in `KeyboardListener`:

- Imported `useStore` from `react-redux` and `selectEnabled` / `selectShortcutByKey` from the store.
- After computing `keyParts` (so modifier-only keys are filtered out via `MODIFIER_ONLY_KEYS`), the listener reads `store.getState()` once and calls `event.preventDefault()` only when `selectEnabled(state)` is true and `selectShortcutByKey(matchKey)(state)` returns a shortcut.
- Existing OS-shortcut `preventDefault` cases and `shouldIgnoreKeyEvent` short-circuit are untouched, so editable fields still receive Enter/typing normally.

`PointerContainer.skipRefocus` is **kept**. The two are complementary:

- `preventDefault` removes the bug class globally (Enter `keyup` no longer activates whatever element gets refocused after a shortcut closes a panel).
- `skipRefocus` remains the explicit opt-out for callers that want no focus restoration at all (Create Model / Open Model trigger buttons).

## Security

None. The change only suppresses the browser's default action for keystrokes that the app already handles; it does not alter authorization, data exposure, or input handling for non-shortcut keys.

## Performance

Negligible. Adds one lookup per `keydown` against the active-context shortcut map (Set/Map membership check). The path is already on the user-input critical path; the added cost is a single hash lookup. No re-renders introduced.
