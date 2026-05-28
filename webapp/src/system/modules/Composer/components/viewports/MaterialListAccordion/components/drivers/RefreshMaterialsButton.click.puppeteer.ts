/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const REFRESH_MATERIALS_TESTID = 'refresh-materials';

const buttonSelector = `[data-testid="${REFRESH_MATERIALS_TESTID}"]`;

export const waitForRefreshMaterialsButton = async (page: Page) => {
  await page.waitForSelector(buttonSelector);
};

export const waitForRefreshMaterialsEnabled = async (page: Page) => {
  await page.waitForSelector(`${buttonSelector}:not(:disabled)`);
};

export const clickRefreshMaterials = async (page: Page) => {
  await waitForRefreshMaterialsEnabled(page);
  await page.click(buttonSelector);
};
