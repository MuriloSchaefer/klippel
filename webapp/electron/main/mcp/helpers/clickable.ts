/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

type Probe =
  | { state: 'missing' }
  | { state: 'hidden' }
  | { state: 'disabled' }
  | { state: 'no-pointer-events' }
  | { state: 'ready'; x: number; y: number; w: number; h: number };

/**
 * Wait until the element matching `selector` is clickable: present, visible,
 * not disabled, accepts pointer events, and has a bounding box that has stopped
 * changing across consecutive samples (i.e. CSS transitions finished).
 *
 * Lives here (and not inline in tool files) because page.evaluate arguments are
 * istanbul-instrumented when used from coverage-tracked sources, which breaks
 * at runtime.
 */
export const waitForClickable = async (
  page: Page,
  selector: string,
  { timeoutMs = 5000, stableMs = 120 }: { timeoutMs?: number; stableMs?: number } = {},
) => {
  await page.waitForSelector(selector, { visible: true, timeout: timeoutMs });
  const deadline = Date.now() + timeoutMs;
  let lastBox: { x: number; y: number; w: number; h: number } | null = null;
  let stableSince = 0;
  let lastState: Probe['state'] = 'missing';

  while (Date.now() < deadline) {
    const probe = (await page.evaluate((sel: string): Probe => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return { state: 'missing' };
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { state: 'hidden' };
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity || '1') < 0.99) {
        return { state: 'hidden' };
      }
      if (style.pointerEvents === 'none') return { state: 'no-pointer-events' };
      const ariaDisabled = el.getAttribute('aria-disabled');
      if ((el as HTMLButtonElement).disabled || ariaDisabled === 'true') return { state: 'disabled' };
      return { state: 'ready', x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    }, selector)) as Probe;

    lastState = probe.state;
    if (probe.state === 'ready') {
      const box = { x: probe.x, y: probe.y, w: probe.w, h: probe.h };
      if (
        lastBox &&
        Math.abs(box.x - lastBox.x) < 0.5 &&
        Math.abs(box.y - lastBox.y) < 0.5 &&
        Math.abs(box.w - lastBox.w) < 0.5 &&
        Math.abs(box.h - lastBox.h) < 0.5
      ) {
        if (Date.now() - stableSince >= stableMs) return;
      } else {
        lastBox = box;
        stableSince = Date.now();
      }
    } else {
      lastBox = null;
      stableSince = 0;
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  throw new Error(`waitForClickable("${selector}") timed out after ${timeoutMs}ms (last state: ${lastState}).`);
};

/** Wait for the element to be clickable, then click it. */
export const clickWhenClickable = async (
  page: Page,
  selector: string,
  options?: { timeoutMs?: number; stableMs?: number },
) => {
  await waitForClickable(page, selector, options);
  await page.click(selector);
};
