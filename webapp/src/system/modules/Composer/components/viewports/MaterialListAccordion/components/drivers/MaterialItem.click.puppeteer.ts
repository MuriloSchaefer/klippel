/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const MATERIAL_ITEM_TESTID = 'material-item';
export const MATERIAL_ITEM_EDIT_TESTID = 'material-item-edit';
export const MATERIAL_ITEM_DELETE_TESTID = 'material-item-delete';

const rowSelector = (label: string) =>
  `[data-testid="${MATERIAL_ITEM_TESTID}"][data-material-label="${label}"]`;

export const waitForMaterialItem = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label));
};

export const waitForMaterialItemRemoved = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label), { hidden: true });
};

export const clickEditMaterial = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${MATERIAL_ITEM_EDIT_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
};

export const clickDeleteMaterial = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${MATERIAL_ITEM_DELETE_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
};
