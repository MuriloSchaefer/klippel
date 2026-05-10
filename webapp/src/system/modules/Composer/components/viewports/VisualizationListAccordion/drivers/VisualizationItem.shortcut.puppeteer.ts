/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  EDIT_VISUALIZATION_FORM_TESTID,
  VISUALIZATION_ITEM_TESTID,
} from './VisualizationItem.click.puppeteer';

export const FOCUS_VISUALIZATION_LIST_SHORTCUT = {
  ctrl: true,
  alt: true,
  key: 'v',
} as const;
export const FOCUS_NEXT_VISUALIZATION_SHORTCUT = 'ArrowDown' as const;
export const FOCUS_PREV_VISUALIZATION_SHORTCUT = 'ArrowUp' as const;
export const EDIT_VISUALIZATION_SHORTCUT = 'e' as const;
export const DELETE_VISUALIZATION_SHORTCUT = 'd' as const;

const rowSelector = (label: string) =>
  `[data-testid="${VISUALIZATION_ITEM_TESTID}"][data-visualization-label="${label}"]`;

export const focusVisualizationItem = async (page: Page, label: string) => {
  const sel = rowSelector(label);
  await page.waitForSelector(sel);
  await page.focus(sel);
  await page.waitForFunction(
    (s: string) => document.activeElement?.matches(s) ?? false,
    {},
    sel,
  );
};

export const triggerFocusVisualizationList = async (page: Page) => {
  await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (a?.matches('[data-testid="visualization-item"]')) a.blur();
  });
  await page.keyboard.down('Control');
  await page.keyboard.down('Alt');
  await page.keyboard.press('v');
  await page.keyboard.up('Alt');
  await page.keyboard.up('Control');
  await page.waitForFunction(
    () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return false;
      if (active.matches('[data-testid="visualization-item"]')) return true;
      if (active.id === 'composer-add-visualization') return true;
      return active.matches('[data-accordion-content="Visualização"]');
    },
    { timeout: 3_000 },
  );
};

export const triggerFocusNextVisualization = async (page: Page) => {
  await page.keyboard.press(FOCUS_NEXT_VISUALIZATION_SHORTCUT);
};

export const triggerFocusPrevVisualization = async (page: Page) => {
  await page.keyboard.press(FOCUS_PREV_VISUALIZATION_SHORTCUT);
};

export const triggerEditVisualizationFromFocused = async (page: Page) => {
  await page.keyboard.press(EDIT_VISUALIZATION_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${EDIT_VISUALIZATION_FORM_TESTID}"]`,
  );
};

export const triggerDeleteVisualizationFromFocused = async (page: Page) => {
  await page.keyboard.press(DELETE_VISUALIZATION_SHORTCUT);
};

export const getFocusedVisualizationLabel = async (
  page: Page,
): Promise<string | null> => {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a?.matches('[data-testid="visualization-item"]')) return null;
    return a.getAttribute('data-visualization-label');
  });
};
