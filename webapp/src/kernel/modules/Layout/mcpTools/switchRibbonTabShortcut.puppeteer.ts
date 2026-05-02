/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const findRibbonTabIndexByLabel = (
  page: Page,
  label: string,
): Promise<number | null> =>
  page.evaluate((lbl: string) => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
    );
    const idx = tabs.findIndex((t) => t.textContent?.trim() === lbl);
    return idx === -1 ? null : idx + 1;
  }, label);
