/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  LINK_ELECTIVE_FORM_TESTID,
  LINK_ELECTIVE_SELECT_TESTID,
} from './ProcessElectiveButton.click.puppeteer';

export const LINK_ELECTIVE_SHORTCUT = 'w' as const;

export const triggerLinkElectiveFromFocused = async (page: Page) => {
  await page.keyboard.press(LINK_ELECTIVE_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${LINK_ELECTIVE_FORM_TESTID}"]`,
  );
};

export const selectLinkElectiveOptionByKeyboard = async (
  page: Page,
  electiveLabel: string,
) => {
  await page.evaluate((id: string) => {
    const node = document.querySelector<HTMLElement>(
      `[role="pointer-panel-content"] [data-testid="${id}"]`,
    );
    node?.focus();
  }, LINK_ELECTIVE_SELECT_TESTID);

  await page.keyboard.press('ArrowDown');
  const optionSel = `[role="listbox"] [data-testid="link-elective-option-${electiveLabel}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};
