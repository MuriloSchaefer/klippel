/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

import { GARMENT_NAME_INPUT_ID } from './GarmentDetails.click.puppeteer';

export const OPEN_GARMENT_DETAILS_SHORTCUT = { ctrl: true, alt: true, key: 'p' } as const;
export const RENAME_GARMENT_SHORTCUT_KEY = 'e' as const;

export const triggerOpenGarmentDetails = async (page: Page) => {
  await page.keyboard.down('Control');
  await page.keyboard.down('Alt');
  await page.keyboard.press(OPEN_GARMENT_DETAILS_SHORTCUT.key);
  await page.keyboard.up('Alt');
  await page.keyboard.up('Control');
  await page.waitForSelector('[role="details-panel"]', { visible: true });
};

export const triggerRenameGarment = async (page: Page) => {
  await page.keyboard.press(RENAME_GARMENT_SHORTCUT_KEY);
  await page.waitForSelector(`#${GARMENT_NAME_INPUT_ID}:focus`);
};

export const typeGarmentNameFromFocused = async (page: Page, value: string) => {
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(value);
};
