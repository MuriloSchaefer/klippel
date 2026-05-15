/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

const OVERLAY_SELECTOR =
  '[role="pointer-panel-content"], ul[role="listbox"], [role="list-options"]';

export const closeOpenOverlays = async (page: Page, maxIterations = 5) => {
  for (let i = 0; i < maxIterations; i++) {
    const open = await page.$(OVERLAY_SELECTOR);
    if (!open) return;
    await page.keyboard.press('Escape');
    await page
      .waitForSelector(OVERLAY_SELECTOR, { hidden: true, timeout: 150 })
      .catch(() => {});
  }
};

// Stronger reset for use between e2e test cases that share a page. Drains every
// open overlay AND blurs any focused input/textarea so the next test starts
// from a known baseline (no residual focus, no half-closed listbox, no pointer
// panel kept mounted from a prior interaction).
export const resetUIState = async (page: Page) => {
  await closeOpenOverlays(page, 10);
  await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return;
    const isTextEntry =
      a.tagName === 'INPUT' ||
      a.tagName === 'TEXTAREA' ||
      a.isContentEditable === true;
    if (isTextEntry) a.blur();
  });
  // Wait for any pointer-panel modal kept mounted with `open=false` to settle —
  // MUI flips `aria-hidden` and `visibility` after the close transition, and
  // a click during that window is the most common source of "panel didn't
  // open" flakes downstream.
  await page
    .waitForSelector('[role="pointer-panel-content"]', {
      hidden: true,
      timeout: 1_000,
    })
    .catch(() => {});
};
