/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const waitForListboxClosed = async (page: Page, timeoutMs = 3000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const open = await page.evaluate(() => document.querySelectorAll('ul[role="listbox"]').length);
    if (open === 0) return;
    await new Promise((r) => setTimeout(r, 60));
  }
  throw new Error(`Listbox did not close within ${timeoutMs}ms — previous popover still open.`);
};

export const pickOptionFromOpenListbox = async (page: Page, optionText: string, timeoutMs = 2000) => {
  await page.waitForSelector('ul[role="listbox"]');
  const deadline = Date.now() + timeoutMs;
  let lastError: string | null = null;
  while (Date.now() < deadline) {
    const result = await page.evaluate((text: string) => {
      const lists = Array.from(document.querySelectorAll('ul[role="listbox"]'));
      const list = lists[lists.length - 1];
      if (!list) return { state: 'no-list' as const };
      const items = Array.from(list.querySelectorAll('li[role="option"]')) as HTMLElement[];
      if (items.length === 0) return { state: 'empty' as const };
      const wanted = text.trim().toLowerCase();
      const target = items.find((li) => (li.textContent || '').trim().toLowerCase() === wanted)
        ?? items.find((li) => (li.textContent || '').trim().toLowerCase().includes(wanted));
      if (!target) return { state: 'no-match' as const, options: items.map((li) => (li.textContent || '').trim()) };
      target.click();
      return { state: 'clicked' as const };
    }, optionText);
    if (result.state === 'clicked') {
      await waitForListboxClosed(page);
      return;
    }
    lastError = result.state === 'no-match'
      ? `Option "${optionText}" not found. Available: ${(result.options || []).join(', ')}`
      : `listbox ${result.state}`;
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error(lastError || `Option "${optionText}" not found in the open listbox.`);
};

export const clickOptionByDataValue = async (page: Page, value: string | number) => {
  await page.waitForSelector('ul[role="listbox"]');
  const clicked = await page.evaluate((v: string) => {
    const lists = Array.from(document.querySelectorAll('ul[role="listbox"]'));
    const list = lists[lists.length - 1];
    if (!list) return false;
    const items = Array.from(list.querySelectorAll('li[role="option"]')) as HTMLElement[];
    const target = items.find((li) => li.getAttribute('data-value') === v);
    if (!target) return false;
    target.click();
    return true;
  }, String(value));
  if (!clicked) throw new Error(`Option with data-value="${value}" not found in the open listbox.`);
  await waitForListboxClosed(page);
};

export const typeaheadAndCommit = async (page: Page, text: string) => {
  await page.waitForSelector('ul[role="listbox"]');
  await page.keyboard.type(text, { delay: 20 });
  await new Promise((r) => setTimeout(r, 80));
  await page.keyboard.press('Enter');
  await waitForListboxClosed(page);
};
