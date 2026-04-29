---
id: 2026-04-27-7ed7e4
name: PointerContainer shortcut-origin anchor
description: Anchor the PointerContainer panel to its trigger element when opened by a keyboard shortcut, instead of always rendering at top-left.
status: implemented
modules: [Pointer]
---

## Context
PointerContainer panels currently anchor at `e.clientX` / `e.clientY` on click. Shortcut handlers open the panel via `document.getElementById(...).click()`, which dispatches a synthetic `MouseEvent` with `clientX === 0`, `clientY === 0`, and `detail === 0` — so every shortcut-opened panel lands at the top-left corner of the window. This breaks the intended "panel appears next to the action you triggered" UX for the keyboard path.

## Change
In `PointerContainer.handleOpen` ([PointerContainer.tsx:233-248](../../components/PointerContainer.tsx#L233-L248)), branch on the click event's origin:

- If `e.detail === 0` (keyboard activation via Enter/Space or programmatic `.click()`), anchor to `e.currentTarget.getBoundingClientRect()` — use `right` / `bottom` so the panel grows toward the viewport center.
- Otherwise (real pointer click), keep the existing `e.clientX` / `e.clientY` behavior.

No API change. No changes to shortcut handlers. The existing `getQuadrant` logic in `ModalContent` already flips translate based on screen position, so anchoring to a button rect at any screen edge stays on-screen.

Files to touch:
- `webapp/src/kernel/modules/Pointer/components/PointerContainer.tsx` — `handleOpen`.

## Status notes
Draft. Open questions:
- Confirm `e.currentTarget` resolves to the cloned Button in every wrapping case (ShortcutHint inside Button, Box wrappers, etc.) — should be true since PointerContainer's `cloneElement(children, { onClick: handleOpen })` binds the listener to the immediate child.
- Decide anchor corner: `right/bottom` vs. `left/bottom` — defaulting to `right/bottom` mirrors current cursor-based "open below to the right" feel, and the quadrant flip handles the edge cases.

## Security
None. The change reads `getBoundingClientRect()` on the same element that already received the click; no new surface, no privilege change.

## Performance
Negligible. One extra `getBoundingClientRect()` call per shortcut-opened panel; not on a hot path.
