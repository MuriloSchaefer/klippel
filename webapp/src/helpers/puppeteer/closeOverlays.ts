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
