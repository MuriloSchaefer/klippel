/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  LOGO_PLACEMENT_ADD_TESTID,
  LOGO_PLACEMENT_ITEM_TESTID,
  LOGO_PLACEMENTS_PANEL_TESTID,
  PLACEMENT_USE_SELECTOR,
} from './LogoPlacementsButton.click.puppeteer';

export const ADD_PLACEMENT_SHORTCUT = 'a' as const;
export const DELETE_PLACEMENT_SHORTCUT = 'd' as const;

const itemsSelector = `[role="pointer-panel-content"] [data-testid="${LOGO_PLACEMENTS_PANEL_TESTID}"] [data-testid="${LOGO_PLACEMENT_ITEM_TESTID}"]`;

/** 'a' adds a placement while the LogoPlacements context is active. That context
 * is focus-scoped (FocusShortcutProvider), so move focus inside the open panel
 * first — otherwise the contextual 'a' never fires. */
export const triggerAddPlacement = async (page: Page) => {
  const before = await page.$$eval(itemsSelector, (els) => els.length);
  const addBtnSel = `[role="pointer-panel-content"] [data-testid="${LOGO_PLACEMENTS_PANEL_TESTID}"] [data-testid="${LOGO_PLACEMENT_ADD_TESTID}"]`;
  await page.waitForSelector(addBtnSel);
  await page.focus(addBtnSel);
  await page.keyboard.press(ADD_PLACEMENT_SHORTCUT);
  await page.waitForFunction(
    (sel: string, prev: number) => document.querySelectorAll(sel).length > prev,
    {},
    itemsSelector,
    before,
  );
  await page.waitForSelector(PLACEMENT_USE_SELECTOR);
};
