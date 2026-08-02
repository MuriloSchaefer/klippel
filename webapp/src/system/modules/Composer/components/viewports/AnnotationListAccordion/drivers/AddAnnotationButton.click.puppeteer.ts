/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../../ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';

export const ANNOTATION_ACCORDION_NAME = 'Anotações';
export const ADD_ANNOTATION_TRIGGER_TESTID = 'add-annotation';
export const ANNOTATION_ITEM_TESTID = 'annotation-item';
export const ANNOTATION_LIST_TESTID = 'annotation-list';

// The annotation's label renders inside the editor SVG as a <text> element.
export const ANNOTATION_TEXT_SELECTOR =
  '#svg-editor text[id^="annotation-text-"]';
export const ANNOTATION_LINE_SELECTOR =
  '#svg-editor line[id^="annotation-line-"]';
export const ANNOTATION_TARGET_SELECTOR =
  '#svg-editor circle[id^="annotation-target-"]';

/** Open the details panel, the Garment Details accordion, then the Anotações
 * accordion so its list is in the DOM. */
export const openAnnotationListAccordion = async (page: Page) => {
  await ensureSettingsPanelExpanded(page);
  await ensureGarmentDetailsAccordionExpanded(page);
  await expandAccordion(page, ANNOTATION_ACCORDION_NAME);
  await page.waitForSelector(`[data-testid="${ANNOTATION_LIST_TESTID}"]`);
};

export const countAnnotationItems = (page: Page) =>
  page.$$eval(
    `[data-testid="${ANNOTATION_ITEM_TESTID}"]`,
    (els) => els.length,
  );

export const countAnnotationTexts = (page: Page) =>
  page.$$eval(ANNOTATION_TEXT_SELECTOR, (els) => els.length);

/** Label of the most recently added annotation row (the last in the list). */
export const lastAnnotationLabel = (page: Page) =>
  page.$$eval(
    `[data-testid="${ANNOTATION_ITEM_TESTID}"]`,
    (els) =>
      (els[els.length - 1] as HTMLElement)?.getAttribute(
        'data-annotation-label',
      ) ?? '',
  );

/** Click "Adicionar Anotação" and wait for the new row plus its injected label
 * in the editor SVG (asserts the annotation actually renders, not just a node). */
export const addAnnotation = async (page: Page) => {
  const before = await countAnnotationItems(page);
  const trigger = `[data-testid="${ADD_ANNOTATION_TRIGGER_TESTID}"]`;
  await page.waitForSelector(trigger);
  // Programmatic click (hit-test bypass, e2e-tests.md §5): the add button sits
  // at the bottom of a scrolling accordion and is wrapped in a ShortcutHint
  // badge, so a positional page.click can land off-target. `.click()` dispatches
  // onClick directly.
  await page.$eval(trigger, (el) => (el as HTMLElement).click());
  await page.waitForFunction(
    (sel: string, prev: number) =>
      document.querySelectorAll(sel).length > prev,
    {},
    `[data-testid="${ANNOTATION_ITEM_TESTID}"]`,
    before,
  );
  await page.waitForSelector(ANNOTATION_TEXT_SELECTOR);
};
