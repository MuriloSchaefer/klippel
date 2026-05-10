/* istanbul ignore file */
import { pickOptionFromOpenListbox, waitForListboxClosed } from '@helpers/puppeteer/listbox';
import type { Page } from 'puppeteer-core';


export const openMaterialTypeSelector = async (page: Page, scopeTestId: string) => {
  const selector = `[data-testid="${scopeTestId}"] [role="combobox"]`;
  await page.waitForSelector(selector);
  await waitForListboxClosed(page);
  await page.click(selector);
  // Autocomplete may not open the listbox on first click; nudge with ArrowDown.
  try {
    await page.waitForSelector('ul[role="listbox"]', { timeout: 500 });
  } catch {
    await page.focus(selector);
    await page.keyboard.press('ArrowDown');
    await page.waitForSelector('ul[role="listbox"]', { timeout: 3000 });
  }
};

export const pickMaterialType = async (page: Page, name: string) => {
  await pickOptionFromOpenListbox(page, name);
};

export const openMaterialTypeMultiSelector = async (page: Page, scopeTestId: string) => {
  const selector = `[data-testid="${scopeTestId}"] [role="combobox"]`;
  await page.waitForSelector(selector);
  await waitForListboxClosed(page);
  await page.click(selector);
  await page.waitForSelector('ul[role="listbox"]');
};

export const toggleMaterialTypeOption = async (page: Page, name: string) => {
  await page.waitForSelector('ul[role="listbox"]');
  const wanted = name.trim().toLowerCase();
  const clicked = await page.evaluate((text: string) => {
    const lists = Array.from(document.querySelectorAll('ul[role="listbox"]'));
    const list = lists[lists.length - 1];
    if (!list) return false;
    const items = Array.from(list.querySelectorAll('li[role="option"]')) as HTMLElement[];
    const target = items.find((li) => (li.textContent || '').trim().toLowerCase() === text)
      ?? items.find((li) => (li.textContent || '').trim().toLowerCase().includes(text));
    if (!target) return false;
    target.click();
    return true;
  }, wanted);
  if (!clicked) throw new Error(`Material type option "${name}" not found in the open listbox.`);
};

export const commitMaterialTypeMulti = async (page: Page) => {
  await page.keyboard.press('Escape');
  await waitForListboxClosed(page);
};
