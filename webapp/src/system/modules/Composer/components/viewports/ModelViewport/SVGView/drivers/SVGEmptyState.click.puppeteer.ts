/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const SVG_EMPTY_STATE_TESTID = 'svg-empty-state';
export const UPLOAD_SVG_BUTTON_TESTID = 'upload-svg-button';
export const UPLOAD_SVG_INPUT_TESTID = 'upload-svg-input';

const SVG_EMPTY_STATE_SELECTOR = `[data-testid="${SVG_EMPTY_STATE_TESTID}"]`;
const UPLOAD_SVG_BUTTON_SELECTOR = `[data-testid="${UPLOAD_SVG_BUTTON_TESTID}"]`;
const SVG_EDITOR_SELECTOR = '#svg-editor';

export const waitForSVGEmptyState = async (page: Page) => {
  await page.waitForSelector(SVG_EMPTY_STATE_SELECTOR, { timeout: 10_000 });
};

export const armChooserAndClickUploadButton = async (
  page: Page,
  filePath: string,
) => {
  await page.waitForSelector(UPLOAD_SVG_BUTTON_SELECTOR, { timeout: 10_000 });
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 10_000 }),
    page.click(UPLOAD_SVG_BUTTON_SELECTOR),
  ]);
  await chooser.accept([filePath]);
};

export const waitForSVGLoaded = async (page: Page) => {
  await page.waitForSelector(SVG_EMPTY_STATE_SELECTOR, {
    hidden: true,
    timeout: 10_000,
  });
  await page.waitForSelector(SVG_EDITOR_SELECTOR, { timeout: 10_000 });
};
