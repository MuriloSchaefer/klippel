---
id: 2026-05-14-0bd4bc
name: Drag pointer panel into view (test helper)
description: Add a puppeteer driver helper that drags an off-screen PointerContainer panel into the viewport via its #drag-panel handle.
status: implemented
modules: [Pointer, Composer]
---

## Context

E2E tests open a `PointerContainer` panel anchored at the click/cursor
position. When the trigger control sits near a viewport edge (e.g. the
"Vincular Eletivo ao Processo" panel opened from a process row low in the
settings panel), the rendered `<Paper>` extends past the bottom/side of the
window. Puppeteer's `page.click` on a control inside the panel then fails with
`Node is either not clickable or not an Element` because the element has no
clickable point inside the viewport.

Observed in `linkProcessElective.e2e.test.ts` →
`selectLinkElectiveOption` clicking `link-elective-select`.

## Change

Add drag helpers to `components/drivers/PointerContainer.click.puppeteer.ts`:

- `getPointerPanelRect(page)` — bounding rect of the open panel's positioned
  `<Paper>` wrapper (the ancestor of `[role="pointer-panel-content"]`).
- `dragPointerPanelBy(page, dx, dy)` — performs a real pointer drag from the
  `#drag-panel` handle: `mouse.down` on the handle centre, `mouse.move` past the
  3px `DRAG_THRESHOLD_PX` in `useDraggable`, then to the target, `mouse.up`. The
  drag listeners live on the `<Modal>`, so a pointerdown on `#drag-panel`
  bubbles up and `setPosition` follows the cursor. The gesture is viewport-
  clamped, so it returns the delta actually applied.
- `dragPointerPanelIntoView(page)` — measures the panel against
  `window.innerWidth/innerHeight`, computes the x/y correction to bring it
  fully on-screen (best-effort top-left align when the panel is larger than the
  viewport), and applies it via `dragPointerPanelBy` over up to `maxPasses`
  passes (the mouse itself is viewport-clamped, so a large correction may need
  several gestures). No-op when already visible or no panel is open.

Viewport size is read from `window` inside the page, not `page.viewport()` —
tests connect with `defaultViewport: null`, where `page.viewport()` is null.

E2E coverage: `components/tests/PointerContainer.drag.e2e.test.ts` — drags the
create-model panel by a known delta and asserts it moved by exactly that delta,
and shoves a panel off the bottom edge then asserts `dragPointerPanelIntoView`
pulls it fully back inside the viewport.

These are test-only driver helpers — `/* istanbul ignore file */` already
applies — no production component change.

## Status notes

Implemented. Drag helpers added to `PointerContainer.click.puppeteer.ts` and
wired into the linkProcessElective click driver (see Composer doc).
`linkProcessElective.e2e.test.ts` and the new
`PointerContainer.drag.e2e.test.ts` both pass headless.

Decision taken: `openPointerPanel` left untouched — the helper is wired
per-driver where edge-anchored panels actually occur, rather than globally, to
avoid changing unrelated panel-open flows.

Separately, production-side: keyboard-opened panels now `scrollIntoView` their
trigger before anchoring (in `PointerContainer.tsx` `handleOpen`), so the
panel does not open off-screen when the trigger is scrolled out of view. The
drag helpers above remain as reusable test tooling.

## Security

None. Test-only helper; no new inputs, auth, or data paths.

## Performance

None in production. Adds a few `page.evaluate` round-trips and one drag
gesture to affected E2E flows only when the panel is off-screen.
