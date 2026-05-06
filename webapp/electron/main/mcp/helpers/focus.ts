/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

/**
 * Blur whatever element currently holds focus in the renderer. Safe to call
 * when nothing is focused. Lives here (and not inline in tools) because
 * `page.evaluate` arguments are istanbul-instrumented when used from
 * coverage-tracked sources, which breaks at runtime.
 */
export const blurActiveElement = async (page: Page) => {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
};
