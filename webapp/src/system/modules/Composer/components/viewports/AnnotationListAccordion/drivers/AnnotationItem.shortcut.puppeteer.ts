/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { annotationItemSelector } from './AnnotationItem.click.puppeteer';

export const DELETE_ANNOTATION_SHORTCUT = 'd' as const;
export const LINK_ELECTIVE_SHORTCUT = 'w' as const;

/** Focus an annotation row so the row-scoped shortcut context activates. */
export const focusAnnotationRowByKeyboard = async (page: Page, label: string) => {
  const target = annotationItemSelector(label);
  await page.waitForSelector(target);
  await page.focus(target);
  await page.waitForSelector(`${target}:focus`);
};

export const triggerDeleteFocusedAnnotation = (page: Page) =>
  page.keyboard.press(DELETE_ANNOTATION_SHORTCUT);

export const triggerLinkElectiveForFocusedAnnotation = async (page: Page) => {
  await page.keyboard.press(LINK_ELECTIVE_SHORTCUT);
  await page.waitForSelector(
    '[role="pointer-panel-content"] [data-testid="annotation-link-elective"]',
  );
};
