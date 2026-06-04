/* istanbul ignore file */
/**
 * Shortcut variant of the MaterialStock search driver. Focuses the
 * search field via the `/` viewport shortcut (registered in
 * `Materials/kernelCalls.ts` — `MaterialStockViewport/focusSearch`),
 * which focuses *and* selects the input, then types the query.
 *
 * Per e2e-tests.md §5 the shortcut variant must NOT import any
 * `*.click.puppeteer.ts` driver — the input selector is duplicated here
 * on purpose so the keyboard path is genuinely independent.
 */
import type { Page } from "puppeteer-core";

export const SEARCH_INPUT = '[data-testid="material-stock-search"] input';

/**
 * Press `/` to focus the search field. The viewport must hold the
 * keyboard context (stock viewport open) and focus must not already be
 * in a text input, or the slash is typed instead of routed.
 */
export const focusMaterialSearchViaShortcut = async (page: Page) => {
  await page.keyboard.press("/");
  await page.waitForSelector(`${SEARCH_INPUT}:focus`);
};

/**
 * Focus via the `/` shortcut, then type the query. The shortcut selects
 * the existing content, so typing replaces any prior query.
 */
export const searchMaterialsViaShortcut = async (page: Page, query: string) => {
  await focusMaterialSearchViaShortcut(page);
  await page.type(SEARCH_INPUT, query);
};
