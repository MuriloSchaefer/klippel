/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const LOGO_ITEM_TESTID = 'logo-item';
export const LOGO_ITEM_COST_TESTID = 'logo-item-cost';
export const LOGO_ITEM_DELETE_TESTID = 'logo-item-delete';
export const LOGO_ITEM_EDIT_TESTID = 'logo-item-edit';
export const LOGO_ITEM_LINK_ELECTIVE_TESTID = 'logo-item-link-elective';
export const LOGO_ITEM_PLACEMENTS_TESTID = 'logo-item-placements';
export const LOGO_ITEM_AUDIT_TESTID = 'logo-item-audit-log';

export const logoItemSelector = (label: string) =>
  `[data-testid="${LOGO_ITEM_TESTID}"][data-logo-label="${label}"]`;

export const waitForLogoItem = (page: Page, label: string) =>
  page.waitForSelector(logoItemSelector(label));

export const waitForLogoItemRemoved = (page: Page, label: string) =>
  page.waitForSelector(logoItemSelector(label), { hidden: true });

/** Focus a logo row (activates the LogoList shortcut context for keyboard flows). */
export const focusLogoRow = async (page: Page, label: string) => {
  const sel = logoItemSelector(label);
  await page.waitForSelector(sel);
  await page.focus(sel);
  await page.waitForSelector(`${sel}:focus`);
};

const clickRowAction = async (page: Page, label: string, actionTestid: string) => {
  const sel = `${logoItemSelector(label)} [data-testid="${actionTestid}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
};

export const deleteLogoByLabel = async (page: Page, label: string) => {
  await clickRowAction(page, label, LOGO_ITEM_DELETE_TESTID);
  await waitForLogoItemRemoved(page, label);
};

export const openLogoEditPanel = async (page: Page, label: string) => {
  await clickRowAction(page, label, LOGO_ITEM_EDIT_TESTID);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-edit-form"]');
};

export const openLogoLinkElectivePanel = async (page: Page, label: string) => {
  await clickRowAction(page, label, LOGO_ITEM_LINK_ELECTIVE_TESTID);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-link-elective"]');
};

export const openLogoPlacementsPanel = async (page: Page, label: string) => {
  await clickRowAction(page, label, LOGO_ITEM_PLACEMENTS_TESTID);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-placements"]');
};

export const openLogoCostAudit = async (page: Page, label: string) => {
  await clickRowAction(page, label, LOGO_ITEM_AUDIT_TESTID);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-cost-audit"]');
};

/** Read the numeric cost shown on the row (the "Custo: N.NN (M posições)" caption). */
export const readLogoRowCost = async (page: Page, label: string): Promise<number> => {
  const sel = `${logoItemSelector(label)} [data-testid="${LOGO_ITEM_COST_TESTID}"]`;
  await page.waitForSelector(sel);
  const text = await page.$eval(sel, (el) => el.textContent ?? '');
  const match = text.match(/Custo:\s*([\d.]+)/);
  return match ? Number(match[1]) : NaN;
};
