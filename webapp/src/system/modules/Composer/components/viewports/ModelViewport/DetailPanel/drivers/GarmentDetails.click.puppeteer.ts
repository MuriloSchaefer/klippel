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
  await page.waitForSelector(`${summarySelector}[aria-expanded="true"]`);
};

export const waitForGarmentDetailsPanelVisible = async (page: Page) => {
  await page.waitForSelector('[role="details-panel"]', { visible: true });
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
