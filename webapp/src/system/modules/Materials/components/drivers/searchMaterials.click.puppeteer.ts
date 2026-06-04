/* istanbul ignore file */
/**
 * Click variant of the MaterialStock search driver. Focuses the search
 * field by clicking it, then types the query through the real UI so the
 * filter runs the production path (controlled input → Redux → filter →
 * grid). The trailing input lives in `MaterialStockToolbar`.
 */
import type { Page } from "puppeteer-core";

export const SEARCH_INPUT = '[data-testid="material-stock-search"] input';

const MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

/** Select-all + delete so a prior query doesn't prefix the new one. */
const clearField = async (page: Page) => {
  await page.keyboard.down(MODIFIER);
  await page.keyboard.press("KeyA");
  await page.keyboard.up(MODIFIER);
  await page.keyboard.press("Backspace");
};

export const focusMaterialSearchViaClick = async (page: Page) => {
  await page.click(SEARCH_INPUT);
  await page.waitForSelector(`${SEARCH_INPUT}:focus`);
};

/** Focus via click, clear, then type the query. */
export const searchMaterialsViaClick = async (page: Page, query: string) => {
  await focusMaterialSearchViaClick(page);
  await clearField(page);
  await page.type(SEARCH_INPUT, query);
};

/** Focus via click and empty the field (back to the full catalog). */
export const clearMaterialSearchViaClick = async (page: Page) => {
  await focusMaterialSearchViaClick(page);
  await clearField(page);
};
