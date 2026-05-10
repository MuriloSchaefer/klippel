/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

const TOGGLE_SELECTOR = '[aria-label="toggle settings panel"]';
const PANEL_SELECTOR = '[role="settings-panel"]';
const PANEL_HEADER_LABEL_SELECTOR = `${PANEL_SELECTOR} [role="panel-header"] span`;

const isExpanded = (page: Page) =>
  page.evaluate(
    (panelSel: string, headerSel: string) => {
      const panel = document.querySelector(panelSel);
      if (!panel) return false;
      return !!document.querySelector(headerSel);
    },
    PANEL_SELECTOR,
    PANEL_HEADER_LABEL_SELECTOR,
  );

export const ensureSettingsPanelExpanded = async (page: Page) => {
  await page.waitForSelector(TOGGLE_SELECTOR);
  if (await isExpanded(page)) return;
  await page.click(TOGGLE_SELECTOR);
  await page.waitForFunction(
    (headerSel: string) => !!document.querySelector(headerSel),
    { timeout: 2000 },
    PANEL_HEADER_LABEL_SELECTOR,
  );
};
