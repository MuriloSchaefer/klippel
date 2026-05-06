---
id: 2026-05-06-a665b6
name: Esc blurs focused input or textarea
description: Pressing Esc while an input or textarea has focus removes focus from it, so tests can drive blur with a real user action instead of the blurActiveElement helper.
status: implemented
modules: [KeyboardShortcuts, Pointer, Layout, Composer]
related_changes: []
---

## Context
E2E and MCP tests dropped focus from inputs/textareas by calling the `blurActiveElement` helper in `webapp/electron/main/mcp/helpers/focus.ts`. Real users have no equivalent action — they can only press a key or click away — so the helper let tests reach states that no user can reproduce. The agreed user-facing affordance is: when an `<input>` or `<textarea>` is focused, pressing `Esc` blurs it.

## Change
- `Layout/kernelCalls` registers a `Global` `Escape` shortcut (`global.input.blur`) that blurs `document.activeElement` when it is an `INPUT`, `TEXTAREA`, or `contenteditable` element. **Layered with popover widgets:** when a `ul[role="listbox"]` is open (MUI Autocomplete/Select), the blur is skipped so MUI's Esc-to-close-listbox runs alone — first Esc closes the listbox (input keeps focus), next Esc blurs. This is what lets Material-type Autocomplete tests press Esc to close the option list without losing focus on the input.
- `Pointer/kernelCalls` `pointer.container.close` (Esc on `Pointer/PointerContainer` context) layers Esc in three steps: (1) if a listbox popover is open, no-op (MUI closes it); (2) else if a text-entry element is focused, blur it; (3) else close the container. Container Esc takes precedence over the global handler because its context sits above `Global` in the context stack.
- `PointerContainer.tsx` Modal ignores MUI's `escapeKeyDown` reason in `onClose` so the keyboard shortcut is the single source of truth for Esc behavior on the container (otherwise MUI auto-closes regardless of focus).
- `KeyboardListener` now binds `keydown`/`keyup` in the capture phase. MUI's Modal handles Escape internally and `stopPropagation`s during its bubble-phase handler, which previously hid the event from the bubble-phase window listener — so neither `pointer.container.close` nor `global.input.blur` ever ran inside an open container. Capture-phase binding ensures shortcut matching always sees the event before MUI can swallow it.
- `renameGarment.ts` and `renameGarmentShortcut.ts` now call `page.keyboard.press('Escape')` instead of the deleted `blurActiveElement` helper.
- Deleted `webapp/electron/main/mcp/helpers/focus.ts` (no remaining callers).

## Status notes
Regression history:
- First cut broke `addMaterial.e2e.test.ts` keyboard-path tests because the Material-type Autocomplete uses Esc to close its option list — our handler was blurring the input at the same time, dropping focus before the test could `Tab`. Fixed by the "skip blur when a listbox is open" rule above.
- Second cut left the same two tests failing because MUI's Modal `stopPropagation`s Escape after handling it (with `escapeKeyDown` reason), so the bubble-phase `KeyboardListener` never saw the event and the layered Esc behavior never ran. After the click "rejects" test threw mid-flow, the leftover panel could not be dismissed by `closeAllOpenContainers`, and the next shortcut test pressed `a` while the label input still had focus — typing `a` into "broken" instead of triggering the open-panel shortcut. Fixed by binding `KeyboardListener` in the capture phase. Verified end-to-end: all 7 tests in `addMaterial.e2e.test.ts` pass.

What's still open:
- **`ShortcutHint` for Esc-blur is not yet wired up.** The Global Esc shortcut applies to every `<input>`/`<textarea>` in the app, so attaching a hint to a single control is impractical. Open question per the original draft: render the hint focus-only on inputs (likely via a kernel-level Input wrapper), or accept this shortcut as an exception to the workspace ShortcutHint rule. Needs user direction.
- `SystemModal` (`Layout/components/SystemModal.tsx`) is not modified. It still uses MUI's default Esc-to-close. If a system modal contains a focused input, MUI will close the modal on Esc rather than blur first. The agreed precedence rule is not satisfied for SystemModal yet — the same intercept pattern used on `PointerContainer` should be applied if/when this becomes a tested path.

## Security
None.

## Performance
Negligible. Two additional shortcut registrations (one Global, one already existed on PointerContainer). No per-render cost.
