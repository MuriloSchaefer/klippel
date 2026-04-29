/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  pickOptionFromOpenListbox,
  waitForListboxClosed,
} from '../../../../../../electron/main/mcp/helpers/listbox';

export const openMaterialTypeSelector = async (page: Page, scopeTestId: string) => {
  const selector = `[data-testid="${scopeTestId}"] [role="combobox"]`;
  await page.waitForSelector(selector);
  await waitForListboxClosed(page);
  await page.click(selector);
};

export const pickMaterialType = async (page: Page, name: string) => {
  await pickOptionFromOpenListbox(page, name);
};
