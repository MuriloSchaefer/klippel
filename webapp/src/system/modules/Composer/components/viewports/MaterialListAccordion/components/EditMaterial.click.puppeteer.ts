/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const EDIT_MATERIAL_FORM_TESTID = 'edit-material-form';
export const EDIT_MATERIAL_TYPE_SCOPE = 'edit-material-type';
export const EDIT_MATERIAL_MATERIAL_SCOPE = 'edit-material-material';
export const EDIT_MATERIAL_SAVE_TESTID = 'edit-material-save';
export const EDIT_MATERIAL_CANCEL_TESTID = 'edit-material-cancel';

export const saveEditMaterial = async (page: Page) => {
  const sel = `[data-testid="${EDIT_MATERIAL_SAVE_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="edit-material-form"]'),
    { timeout: 5_000 },
  );
};

export const cancelEditMaterial = async (page: Page) => {
  const sel = `[data-testid="${EDIT_MATERIAL_CANCEL_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="edit-material-form"]'),
    { timeout: 5_000 },
  );
};
