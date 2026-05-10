import { pickOptionFromOpenListbox, waitForListboxClosed } from '@helpers/puppeteer/listbox';
import type { Page } from 'puppeteer-core';


export const pickMaterialTypeFromFocused = async (page: Page, name: string) => {
  // Autocomplete: open the listbox via ArrowDown, type to filter, then click the
  // matching option directly. Pressing Enter alone is unreliable because the MUI
  // Autocomplete here has no `autoHighlight` — after typing, no option is
  // highlighted, so Enter does not commit.
  await page.keyboard.press('ArrowDown');
  await page.waitForSelector('ul[role="listbox"]');
  await page.keyboard.type(name, { delay: 20 });
  await pickOptionFromOpenListbox(page, name);
};

export const toggleMaterialTypeOptionFromFocused = async (page: Page, name: string) => {
  await page.keyboard.press('Enter');
  await page.waitForSelector('ul[role="listbox"]');
  const wanted = name.trim().toLowerCase();
  const toggled = await page.evaluate((text: string) => {
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
  if (!toggled) throw new Error(`Material type option "${name}" not found in the open listbox.`);
  await page.keyboard.press('Escape');
  await waitForListboxClosed(page);
};
