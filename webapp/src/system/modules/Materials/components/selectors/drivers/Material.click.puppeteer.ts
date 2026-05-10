/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  clickOptionByDataValue,
  pickOptionFromOpenListbox,
  waitForListboxClosed,
} from '@helpers/puppeteer/listbox';

export const MATERIAL_PRINCIPAL_TESTID = 'material-selector-principal';
export const MATERIAL_EXTRA_TESTID = 'material-selector-extra';

const principalSelector = (scopeTestId: string) =>
  `[data-testid="${scopeTestId}"] [data-testid="${MATERIAL_PRINCIPAL_TESTID}"] [role="combobox"]`;

const extraSelector = (scopeTestId: string) =>
  `[data-testid="${scopeTestId}"] [data-testid="${MATERIAL_EXTRA_TESTID}"] [role="combobox"]`;

const openPrincipal = async (page: Page, scopeTestId: string) => {
  const sel = principalSelector(scopeTestId);
  await page.waitForSelector(sel);
  await waitForListboxClosed(page);
  await page.click(sel);
};

const openExtra = async (page: Page, scopeTestId: string) => {
  const sel = extraSelector(scopeTestId);
  await page.waitForSelector(`${sel}:not([aria-disabled="true"])`);
  await waitForListboxClosed(page);
  await page.click(sel);
};

export const pickMaterialByPrincipalAndExtra = async (
  page: Page,
  {
    principal,
    extra,
    scopeTestId,
  }: { principal: string; extra?: string; scopeTestId: string },
) => {
  await openPrincipal(page, scopeTestId);
  await pickOptionFromOpenListbox(page, principal);

  await openExtra(page, scopeTestId);
  if (extra) {
    await pickOptionFromOpenListbox(page, extra);
  } else {
    await page.waitForSelector('ul[role="listbox"] li[role="option"]');
    const clicked = await page.evaluate(() => {
      const lists = Array.from(document.querySelectorAll('ul[role="listbox"]'));
      const list = lists[lists.length - 1];
      const first = list?.querySelector('li[role="option"]') as HTMLElement | null;
      if (!first) return false;
      first.click();
      return true;
    });
    if (!clicked) throw new Error('No extra options available for selected principal.');
    await waitForListboxClosed(page);
  }
};

export const pickMaterialById = async (
  page: Page,
  id: number,
  { scopeTestId }: { scopeTestId: string },
) => {
  await openPrincipal(page, scopeTestId);
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

  await openExtra(page, scopeTestId);
  await clickOptionByDataValue(page, id);
};
