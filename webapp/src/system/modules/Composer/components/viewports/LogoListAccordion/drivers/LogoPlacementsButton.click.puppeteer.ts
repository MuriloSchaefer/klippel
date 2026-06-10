/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { logoItemSelector } from './LogoItem.click.puppeteer';

export const LOGO_PLACEMENTS_PANEL_TESTID = 'logo-placements';
export const LOGO_PLACEMENT_ITEM_TESTID = 'logo-placement-item';
export const LOGO_PLACEMENT_NAME_TESTID = 'logo-placement-name';
export const LOGO_PLACEMENT_DELETE_TESTID = 'logo-placement-delete';
export const LOGO_PLACEMENT_ADD_TESTID = 'logo-placement-add';
export const LOGO_PLACEMENT_WIDTH_TESTID = 'logo-placement-width';
export const LOGO_PLACEMENT_HEIGHT_TESTID = 'logo-placement-height';
export const LOGO_PLACEMENT_COST_EXPRESSION_TESTID = 'logo-placement-cost-expression';

const panel = (sub: string) =>
  `[role="pointer-panel-content"] [data-testid="${LOGO_PLACEMENTS_PANEL_TESTID}"] ${sub}`;

const itemSelector = (index: number) =>
  panel(`[data-testid="${LOGO_PLACEMENT_ITEM_TESTID}"]:nth-of-type(${index + 1})`);

/** A placement <use> mounted into the live editor content (the visible copy). */
export const PLACEMENT_USE_SELECTOR = '#svg-editor use[id^="logo-"]';

export const countPlacementItems = (page: Page) =>
  page.$$eval(panel(`[data-testid="${LOGO_PLACEMENT_ITEM_TESTID}"]`), (els) => els.length);

export const countPlacementUses = (page: Page) =>
  page.$$eval(PLACEMENT_USE_SELECTOR, (els) => els.length);

export const openLogoPlacements = async (page: Page, logoLabel: string) => {
  const trigger = `${logoItemSelector(logoLabel)} [data-testid="logo-item-placements"]`;
  await page.waitForSelector(trigger);
  await page.click(trigger);
  await page.waitForSelector(panel(''));
};

/** Click "Adicionar posição" and wait until a new placement row + its <use> exist. */
export const addPlacement = async (page: Page) => {
  const before = await countPlacementItems(page);
  await page.click(panel(`[data-testid="${LOGO_PLACEMENT_ADD_TESTID}"]`));
  await page.waitForFunction(
    (sel: string, prev: number) =>
      document.querySelectorAll(sel).length > prev,
    {},
    panel(`[data-testid="${LOGO_PLACEMENT_ITEM_TESTID}"]`),
    before,
  );
  await page.waitForSelector(PLACEMENT_USE_SELECTOR);
};

const placementInput = (index: number, testid: string) =>
  `${itemSelector(index)} [data-testid="${testid}"] input`;

export const renamePlacement = async (page: Page, index: number, name: string) => {
  const sel = placementInput(index, LOGO_PLACEMENT_NAME_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, name);
  // The name input mirrors the placement name; wait for the value to settle.
  await page.waitForFunction(
    (s: string, v: string) =>
      (document.querySelector(s) as HTMLInputElement | null)?.value === v,
    {},
    sel,
    name,
  );
};

export const resizePlacement = async (
  page: Page,
  index: number,
  dimension: 'width' | 'height',
  amount: number,
) => {
  const testid =
    dimension === 'width' ? LOGO_PLACEMENT_WIDTH_TESTID : LOGO_PLACEMENT_HEIGHT_TESTID;
  const sel = `${itemSelector(index)} [data-testid="${testid}"] input#amount`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, String(amount));
};

/** Set the cost expression on the placement at `index`. */
export const setPlacementCostExpression = async (
  page: Page,
  index: number,
  expression: string,
) => {
  const sel = placementInput(index, LOGO_PLACEMENT_COST_EXPRESSION_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, expression);
  // The input mirrors the placement expression; wait for the value to settle.
  await page.waitForFunction(
    (s: string, v: string) =>
      (document.querySelector(s) as HTMLInputElement | null)?.value === v,
    {},
    sel,
    expression,
  );
};

export const readPlacementName = async (page: Page, index: number): Promise<string> => {
  const sel = placementInput(index, LOGO_PLACEMENT_NAME_TESTID);
  await page.waitForSelector(sel);
  return page.$eval(sel, (el) => (el as HTMLInputElement).value);
};

export const deletePlacement = async (page: Page, index: number) => {
  const before = await countPlacementItems(page);
  await page.click(`${itemSelector(index)} [data-testid="${LOGO_PLACEMENT_DELETE_TESTID}"]`);
  await page.waitForFunction(
    (sel: string, prev: number) =>
      document.querySelectorAll(sel).length < prev,
    {},
    panel(`[data-testid="${LOGO_PLACEMENT_ITEM_TESTID}"]`),
    before,
  );
};
