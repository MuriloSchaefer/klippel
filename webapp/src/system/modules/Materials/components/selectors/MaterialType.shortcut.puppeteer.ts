import type { Page } from 'puppeteer-core';
import { typeaheadAndCommit } from '../../../../../../electron/main/mcp/helpers/listbox';

export const pickMaterialTypeFromFocused = async (page: Page, name: string) => {
  await page.keyboard.press('Enter');
  await typeaheadAndCommit(page, name);
};
