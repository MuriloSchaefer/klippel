/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const COMPOSITION_TREE_TESTID = 'composition-tree';

const treeSelector = `[data-testid="${COMPOSITION_TREE_TESTID}"]`;
const rootItemSelector = `${treeSelector} [role="treeitem"]`;

export const clickGarmentTreeItem = async (page: Page) => {
  await page.waitForSelector(rootItemSelector, { timeout: 5000 });
  await page.click(rootItemSelector);
};
