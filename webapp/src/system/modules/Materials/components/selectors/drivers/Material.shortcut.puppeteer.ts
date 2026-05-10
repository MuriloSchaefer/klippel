import type { Page } from 'puppeteer-core';
import {
  clickOptionByDataValue,
  typeaheadAndCommit,
  waitForListboxClosed,
} from '@helpers/puppeteer/listbox';

/**
 * Pick a material by its visible principal/extra labels. Assumes focus is on the
 * principal Select. Tabs forward to the extra Select between phases. Leaves focus
 * past the extra Select on completion.
 */
export const pickMaterialByPrincipalAndExtraFromFocused = async (
  page: Page,
  { principal, extra }: { principal: string; extra?: string },
) => {
  await page.keyboard.press('Enter');
  await typeaheadAndCommit(page, principal);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  if (extra) {
    await typeaheadAndCommit(page, extra);
  } else {
    await page.waitForSelector('ul[role="listbox"]');
    await page.keyboard.press('Enter');
    await waitForListboxClosed(page);
  }
};

/**
 * Pick a material by its integer id. Assumes focus is on the principal Select.
 * Resolves the principal that contains the id by reading data-material-ids on the
 * rendered principal MenuItems, clicks it, then clicks the extra item by data-material-id.
 */
export const pickMaterialByIdFromFocused = async (page: Page, id: number) => {
  await page.keyboard.press('Enter');
  await page.waitForSelector('ul[role="listbox"]');
  const principalKey = await page.evaluate((targetId: number) => {
    const lists = Array.from(document.querySelectorAll('ul[role="listbox"]'));
    const list = lists[lists.length - 1];
    if (!list) return null;
    const items = Array.from(list.querySelectorAll('li[role="option"]')) as HTMLElement[];
    const match = items.find((li) => {
      const ids = (li.getAttribute('data-material-ids') || '').split(',').map((s) => s.trim());
      return ids.includes(String(targetId));
    });
    return match?.getAttribute('data-principal-key') ?? null;
  }, id);
  if (!principalKey) throw new Error(`Material id ${id} not present in selector`);
  await clickOptionByDataValue(page, principalKey);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await clickOptionByDataValue(page, id);
};
