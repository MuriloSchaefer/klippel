/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  ADD_ANNOTATION_TRIGGER_TESTID,
  ANNOTATION_ITEM_TESTID,
  ANNOTATION_TEXT_SELECTOR,
  countAnnotationItems,
} from './AddAnnotationButton.click.puppeteer';

export const ADD_ANNOTATION_SHORTCUT = 'a' as const;

/** Focus the add button so the AnnotationList shortcut context is active, then
 * press 'a' (contextual). Waits for the new row + its injected editor label. */
export const triggerAddAnnotation = async (page: Page) => {
  const addBtnSel = `[data-testid="${ADD_ANNOTATION_TRIGGER_TESTID}"]`;
  await page.waitForSelector(addBtnSel);
  await page.focus(addBtnSel);
  const before = await countAnnotationItems(page);
  await page.keyboard.press(ADD_ANNOTATION_SHORTCUT);
  await page.waitForFunction(
    (sel: string, prev: number) =>
      document.querySelectorAll(sel).length > prev,
    {},
    `[data-testid="${ANNOTATION_ITEM_TESTID}"]`,
    before,
  );
  await page.waitForSelector(ANNOTATION_TEXT_SELECTOR);
};
