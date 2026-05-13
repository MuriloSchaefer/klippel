/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { MATERIAL_ITEM_TESTID } from './MaterialItem.click.puppeteer';

export const MATERIAL_ITEM_AUDIT_LOG_TESTID = 'material-item-audit-log';
export const MATERIAL_COST_AUDIT_TESTID = 'material-cost-audit';
export const MATERIAL_COST_INFO_TESTID = 'material-cost-info';

const rowSelector = (label: string) =>
  `[data-testid="${MATERIAL_ITEM_TESTID}"][data-material-label="${label}"]`;

export const clickMaterialAuditLog = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${MATERIAL_ITEM_AUDIT_LOG_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${MATERIAL_COST_AUDIT_TESTID}"][data-material-audit-label="${label}"]`,
  );
};

export const readMaterialAuditText = async (
  page: Page,
  label: string,
): Promise<string> => {
  const sel = `[role="pointer-panel-content"] [data-testid="${MATERIAL_COST_AUDIT_TESTID}"][data-material-audit-label="${label}"]`;
  await page.waitForSelector(sel);
  const text = await page.$eval(sel, (el) => (el as HTMLElement).innerText);
  return text;
};

export const readMaterialCostInfoText = async (
  page: Page,
  label: string,
): Promise<string> => {
  const sel = `${rowSelector(label)} [data-testid="${MATERIAL_COST_INFO_TESTID}"]`;
  await page.waitForSelector(sel);
  return page.$eval(sel, (el) => (el as HTMLElement).innerText);
};
