/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const POINTER_PANEL_CONTENT_ROLE = 'pointer-panel-content';
export const POINTER_PANEL_ACTIONS_ROLE = 'pointer-panel-actions';
export const POINTER_PANEL_CONFIRM_SELECTOR =
  `[role="${POINTER_PANEL_ACTIONS_ROLE}"] button:not(#drag-panel):not(#close-panel)`;
export const POINTER_PANEL_CLOSE_SELECTOR = `[role="${POINTER_PANEL_ACTIONS_ROLE}"] #close-panel`;

export const openPointerPanel = async (
  page: Page,
  triggerSelector: string,
  formTestId?: string,
) => {
  await page.keyboard.press('Escape').catch(() => {});
  await page.click(triggerSelector);
  const target = formTestId
    ? `[role="${POINTER_PANEL_CONTENT_ROLE}"] [data-testid="${formTestId}"]`
    : `[role="${POINTER_PANEL_CONTENT_ROLE}"]`;
  await page.waitForSelector(target);
};

export const confirmPointerPanel = async (page: Page) => {
  await page.waitForSelector(POINTER_PANEL_CONFIRM_SELECTOR);
  const disabled = await page.$eval(POINTER_PANEL_CONFIRM_SELECTOR, (el) => (el as HTMLButtonElement).disabled);
  if (disabled) throw new Error('PointerContainer confirm button is disabled — form validation failed.');
  await page.click(POINTER_PANEL_CONFIRM_SELECTOR);
  await page.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"]'),
    { timeout: 2000 },
  );
};

export const closePointerPanel = async (page: Page) => {
  await page.waitForSelector(POINTER_PANEL_CLOSE_SELECTOR);
  await page.click(POINTER_PANEL_CLOSE_SELECTOR);
};
