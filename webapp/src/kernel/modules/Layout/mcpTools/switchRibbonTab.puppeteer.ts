/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const clickRibbonTab = (
  page: Page,
  tabIndex: number | undefined,
  label: string | undefined,
): Promise<boolean> =>
  page.evaluate(
    (index: number | undefined, lbl: string | undefined) => {
      if (typeof index === 'number') {
        const id = `Layout/RibbonMenu/${index - 1}`;
        const el = document.getElementById(id) as HTMLElement | null;
        if (!el) return false;
        el.click();
        return true;
      }
      const tabs = Array.from(
        document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
      );
      const match = tabs.find((t) => t.textContent?.trim() === lbl);
      if (!match) return false;
      match.click();
      return true;
    },
    tabIndex,
    label,
  );
