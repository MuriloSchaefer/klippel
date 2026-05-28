/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const REFRESH_MATERIALS_SHORTCUT = 'r' as const;
export const REFRESH_MATERIALS_TESTID = 'refresh-materials';

const buttonSelector = `[data-testid="${REFRESH_MATERIALS_TESTID}"]`;

/**
 * Press `r` to trigger the material-snapshot refresh shortcut. Assumes the
 * MATERIAL_LIST context is active (focus is inside the model viewport with
 * the materials accordion mounted).
 */
export const triggerRefreshMaterials = async (page: Page) => {
  await page.waitForSelector(`${buttonSelector}:not(:disabled)`);
  await page.keyboard.press(REFRESH_MATERIALS_SHORTCUT);
};
