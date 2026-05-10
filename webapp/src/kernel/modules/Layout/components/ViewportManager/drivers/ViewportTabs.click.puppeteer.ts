/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

/**
 * Click the viewport tab at `index` (1-based, excluding the home and
 * new-viewport tabs). Returns false if no tab exists at that index.
 */
export const clickViewportTabByIndex = (page: Page, index: number): Promise<boolean> =>
  page.evaluate((i: number) => {
    const tabsRoot = document.querySelector('[role="viewport-tabs"]');
    if (!tabsRoot) return false;
    const allTabs = Array.from(tabsRoot.querySelectorAll('[role="tab"]'));
    const viewportTabs = allTabs.filter(
      (el) => el.id !== 'home' && el.id !== 'new-viewport',
    );
    const target = viewportTabs[i - 1] as HTMLElement | undefined;
    if (!target) return false;
    target.click();
    return true;
  }, index);
