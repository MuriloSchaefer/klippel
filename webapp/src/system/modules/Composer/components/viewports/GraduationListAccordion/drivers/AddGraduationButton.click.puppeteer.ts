/* istanbul ignore file */
import { clickWhenClickable } from '@helpers/puppeteer/clickable';
import type { Page } from 'puppeteer-core';

export const ADD_GRADUATION_TESTID = 'add-graduation';
export const ADD_GRADUATION_FORM_TESTID = 'add-graduation-form';
export const ADD_GRADUATION_NAMES_TESTID = 'add-graduation-names';
export const ADD_GRADUATION_CONFIRM_TESTID = 'add-graduation-confirm';

const NAMES_INPUT_SELECTOR =
  `[role="pointer-panel-content"] [data-testid="${ADD_GRADUATION_NAMES_TESTID}"] textarea, [role="pointer-panel-content"] [data-testid="${ADD_GRADUATION_NAMES_TESTID}"] input`;

export const clickAddGraduation = async (page: Page) => {
  await page.keyboard.press('Escape').catch(() => {});
  await clickWhenClickable(page, '#composer-add-graduation');
  await page.waitForSelector(`[role="pointer-panel-content"] [data-testid="${ADD_GRADUATION_FORM_TESTID}"]`);
};

export const typeNamesAndConfirm = async (page: Page, names: string) => {
  await page.waitForSelector(NAMES_INPUT_SELECTOR);
  // Don't rely on autoFocus — explicitly focus the visible textarea (MUI
  // multiline TextField also renders an aria-hidden textarea for measuring).
  await page.evaluate((sel: string) => {
    const nodes = Array.from(document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>(sel));
    const target = nodes.find((n) => n.getAttribute('aria-hidden') !== 'true' && !n.hasAttribute('readonly')) ?? nodes[0];
    target?.focus();
  }, NAMES_INPUT_SELECTOR);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(names);

  const confirmSelector = `[data-testid="${ADD_GRADUATION_CONFIRM_TESTID}"]`;
  await page.waitForSelector(`${confirmSelector}:not([disabled])`);
  await page.click(confirmSelector);
  await page.waitForSelector('[role="pointer-panel-content"]', { hidden: true });
};
