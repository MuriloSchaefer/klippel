/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const POINTER_PANEL_CONTENT_ROLE = 'pointer-panel-content';
export const POINTER_PANEL_ACTIONS_ROLE = 'pointer-panel-actions';
export const POINTER_PANEL_CONFIRM_SELECTOR =
  `[role="${POINTER_PANEL_ACTIONS_ROLE}"] button:not(#drag-panel):not(#close-panel)`;
export const POINTER_PANEL_CLOSE_SELECTOR = `[role="${POINTER_PANEL_ACTIONS_ROLE}"] #close-panel`;

export const openPointerPanel = async (
  page: Page,
  triggerSelector: string,
  formTestId?: string,
) => {
  await page.keyboard.press('Escape').catch(() => {});
  await page.click(triggerSelector);
  const target = formTestId
    ? `[role="${POINTER_PANEL_CONTENT_ROLE}"] [data-testid="${formTestId}"]`
    : `[role="${POINTER_PANEL_CONTENT_ROLE}"]`;
  await page.waitForSelector(target);
};

export const confirmPointerPanel = async (page: Page) => {
  await page.waitForSelector(POINTER_PANEL_CONFIRM_SELECTOR);
  const disabled = await page.$eval(POINTER_PANEL_CONFIRM_SELECTOR, (el) => (el as HTMLButtonElement).disabled);
  if (disabled) throw new Error('PointerContainer confirm button is disabled — form validation failed.');
  await page.click(POINTER_PANEL_CONFIRM_SELECTOR);
  await page.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"]'),
    { timeout: 2000 },
  );
};

export const closePointerPanel = async (page: Page) => {
  await page.waitForSelector(POINTER_PANEL_CLOSE_SELECTOR);
  await page.click(POINTER_PANEL_CLOSE_SELECTOR);
};

export const DRAG_PANEL_SELECTOR = '#drag-panel';

export type PointerPanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

type PointerPanelMeasurement = PointerPanelRect & {
  viewportWidth: number;
  viewportHeight: number;
};

// Measure the open panel's positioned <Paper> wrapper plus the viewport size.
// Reads the viewport from `window` rather than `page.viewport()` because tests
// connect with `defaultViewport: null`, where `page.viewport()` returns null.
const measurePointerPanel = async (
  page: Page,
): Promise<PointerPanelMeasurement | null> => {
  return page.evaluate(() => {
    const content = document.querySelector('[role="pointer-panel-content"]');
    if (!content) return null;
    // Walk up to the positioned <Paper> wrapper.
    let panel: HTMLElement | null = content as HTMLElement;
    while (panel && window.getComputedStyle(panel).position !== 'fixed') {
      panel = panel.parentElement;
    }
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
};

/** Bounding rect of the open PointerContainer panel, or null when none is open. */
export const getPointerPanelRect = async (
  page: Page,
): Promise<PointerPanelRect | null> => {
  const m = await measurePointerPanel(page);
  if (!m) return null;
  const { viewportWidth: _vw, viewportHeight: _vh, ...rect } = m;
  return rect;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/**
 * Drag the open panel by (dx, dy) using its `#drag-panel` handle.
 *
 * Returns the actual delta applied — the gesture is clamped to the viewport, so
 * a requested move that would push the handle off-screen is truncated.
 */
export const dragPointerPanelBy = async (
  page: Page,
  dx: number,
  dy: number,
): Promise<{ dx: number; dy: number }> => {
  const measurement = await measurePointerPanel(page);
  if (!measurement) {
    throw new Error('dragPointerPanelBy: no PointerContainer panel is open.');
  }
  const handle = await page.$(DRAG_PANEL_SELECTOR);
  if (!handle) {
    throw new Error('dragPointerPanelBy: no #drag-panel handle found.');
  }
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error('dragPointerPanelBy: #drag-panel has no bounding box.');
  }

  const { viewportWidth: vw, viewportHeight: vh } = measurement;
  const startX = clamp(box.x + box.width / 2, 2, vw - 2);
  const startY = clamp(box.y + box.height / 2, 2, vh - 2);
  const targetX = clamp(startX + dx, 2, vw - 2);
  const targetY = clamp(startY + dy, 2, vh - 2);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Prime past useDraggable's 3px DRAG_THRESHOLD_PX so the gesture is
  // recognised as a drag (and the pointer is captured) before the real move.
  await page.mouse.move(startX + 8, startY, { steps: 2 });
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.mouse.up();

  // Let React apply the new position before callers re-measure.
  await new Promise((r) => setTimeout(r, 50));

  return { dx: targetX - startX, dy: targetY - startY };
};

/**
 * Drag an open PointerContainer panel until it is fully inside the viewport.
 *
 * A panel is anchored at the click/cursor position, so one opened from a
 * control near a viewport edge can render partly off-screen — `page.click` on
 * a control inside it then fails with "Node is either not clickable". This
 * grabs the `#drag-panel` handle and moves the panel back on-screen.
 *
 * No-op when no panel is open or the panel is already fully visible. Drags in
 * up to `maxPasses` passes because the mouse itself is clamped to the viewport,
 * so a large correction may need several incremental gestures.
 */
export const dragPointerPanelIntoView = async (
  page: Page,
  { margin = 8, maxPasses = 6 }: { margin?: number; maxPasses?: number } = {},
) => {
  for (let pass = 0; pass < maxPasses; pass++) {
    const m = await measurePointerPanel(page);
    if (!m) return;

    let dx = 0;
    let dy = 0;
    if (m.right > m.viewportWidth - margin) {
      dx = m.viewportWidth - margin - m.right;
    }
    if (m.x + dx < margin) dx = margin - m.x;
    if (m.bottom > m.viewportHeight - margin) {
      dy = m.viewportHeight - margin - m.bottom;
    }
    if (m.y + dy < margin) dy = margin - m.y;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    await dragPointerPanelBy(page, dx, dy);
  }
};
