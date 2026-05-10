/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const GARMENT_NAME_INPUT_ID = 'garment-name';
export const GARMENT_DETAILS_ACCORDION_NAME = 'Detalhes da Peça';

const summarySelector = `[role="accordion-${GARMENT_DETAILS_ACCORDION_NAME}"] [aria-controls="accordion-${GARMENT_DETAILS_ACCORDION_NAME}-content"]`;

export const ensureGarmentDetailsAccordionExpanded = async (page: Page) => {
  await page.waitForSelector(summarySelector, { timeout: 5000 });
  const expanded = await page.$eval(summarySelector, (el) => el.getAttribute('aria-expanded') === 'true');
  if (expanded) return;
  await page.click(summarySelector);
  await page.waitForFunction(
    (sel: string) => document.querySelector(sel)?.getAttribute('aria-expanded') === 'true',
    { timeout: 2000 },
    summarySelector,
  );
};

export const waitForGarmentDetailsPanelVisible = async (page: Page, timeoutMs = 5000) => {
  await page.waitForFunction(
    () => {
      const panel = document.querySelector('[role="details-panel"]') as HTMLElement | null;
      return !!panel && window.getComputedStyle(panel).display !== 'none';
    },
    { timeout: timeoutMs },
  );
};

export const fillGarmentName = async (page: Page, value: string) => {
  const inputSel = `#${GARMENT_NAME_INPUT_ID}`;
  await page.waitForSelector(inputSel, { timeout: 5000 });
  await page.focus(inputSel);
  await page.$eval(inputSel, (el) => {
    const input = el as HTMLInputElement;
    input.setSelectionRange(0, input.value.length);
  });
  await page.keyboard.press('Backspace');
  await page.type(inputSel, value);
};
