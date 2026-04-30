import type { Page } from 'puppeteer-core';

/**
 * Confirm the edit form via keyboard. Assumes focus is on the save button
 * (the tool owns Tab traversal to get here). Leaves the form closed.
 */
export const confirmEditMaterialFromFocused = async (page: Page) => {
  await page.waitForSelector('[data-testid="edit-material-save"]');
  await page.focus('[data-testid="edit-material-save"]');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="edit-material-form"]'),
    { timeout: 5_000 },
  );
};

/**
 * Cancel the edit form via keyboard. Assumes focus is on the cancel button.
 */
export const cancelEditMaterialFromFocused = async (page: Page) => {
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="edit-material-form"]'),
    { timeout: 5_000 },
  );
};
