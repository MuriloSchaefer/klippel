import type { Page } from 'puppeteer-core';

export const CONFIRM_POINTER_PANEL_SHORTCUT = { modifier: 'Control', key: 'Enter' } as const;
export const CLOSE_POINTER_PANEL_SHORTCUT = 'Escape' as const;

export const confirmPointerPanelShortcut = async (page: Page) => {
  await page.bringToFront();
  await page.keyboard.down(CONFIRM_POINTER_PANEL_SHORTCUT.modifier);
  await page.keyboard.press(CONFIRM_POINTER_PANEL_SHORTCUT.key);
  await page.keyboard.up(CONFIRM_POINTER_PANEL_SHORTCUT.modifier);
  await page.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"]'),
    { timeout: 2000 },
  );
};

export const closePointerPanelShortcut = async (page: Page) => {
  await page.bringToFront();
  await page.keyboard.press(CLOSE_POINTER_PANEL_SHORTCUT);
  await page.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"]'),
    { timeout: 2000 },
  );
};
