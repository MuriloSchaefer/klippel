/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

const clearInput = async (page: Page, selector: string) => {
  await page.focus(selector);
  await page.$eval(selector, (el) => {
    const input = el as HTMLInputElement;
    input.select();
  });
  await page.keyboard.press('Backspace');
};

export const fillCreateModelForm = async (
  page: Page,
  name: string,
  id: string | undefined,
) => {
  if (id !== undefined) {
    await clearInput(page, '#hashId');
    await page.type('#hashId', id);
  }
  await clearInput(page, '#name');
  await page.type('#name', name);
};
