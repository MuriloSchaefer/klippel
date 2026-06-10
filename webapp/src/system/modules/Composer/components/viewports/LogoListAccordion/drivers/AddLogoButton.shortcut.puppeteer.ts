/* istanbul ignore file */
import type { ElementHandle, Page } from 'puppeteer-core';
import {
  ADD_LOGO_COLORS_TESTID,
  ADD_LOGO_FILE_INPUT_TESTID,
  ADD_LOGO_FORM_TESTID,
  ADD_LOGO_METHOD_TESTID,
  ADD_LOGO_NAME_TESTID,
} from './AddLogoButton.click.puppeteer';

export const ADD_LOGO_SHORTCUT = 'a' as const;

const focusPanelField = (page: Page, testid: string) =>
  page.evaluate((id: string) => {
    const node = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[role="pointer-panel-content"] [data-testid="${id}"] input, [role="pointer-panel-content"] [data-testid="${id}"] textarea`,
    );
    node?.focus();
  }, testid);

const clearFocusedAndType = async (page: Page, value: string) => {
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(value);
};

/** 'a' is contextual: fires only when focus is inside the Logos list. */
export const triggerAddLogo = async (page: Page) => {
  await page.keyboard.press(ADD_LOGO_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ADD_LOGO_FORM_TESTID}"]`,
  );
};

export const typeAddLogoNameFromFocused = async (page: Page, name: string) => {
  await focusPanelField(page, ADD_LOGO_NAME_TESTID);
  await clearFocusedAndType(page, name);
};

export const setAddLogoColorsFromFocused = async (page: Page, colors: number) => {
  await focusPanelField(page, ADD_LOGO_COLORS_TESTID);
  await clearFocusedAndType(page, String(colors));
};

/** MUI Select is opened with the keyboard, then the option is chosen by value.
 * The shortcut binding under test is the panel-open 'a'; the in-form widget is
 * driven directly (mirrors the visualization shortcut driver). */
export const setAddLogoMethodFromKeyboard = async (page: Page, method: string) => {
  const selectSel = `[role="pointer-panel-content"] [data-testid="${ADD_LOGO_METHOD_TESTID}"]`;
  await page.waitForSelector(selectSel);
  await page.click(selectSel);
  const optionSel = `[role="listbox"] [data-testid="add-logo-method-option-${method}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

export const uploadAddLogoFileShortcut = async (page: Page, filePath: string) => {
  const inputSel = `[role="pointer-panel-content"] [data-testid="${ADD_LOGO_FILE_INPUT_TESTID}"]`;
  await page.waitForSelector(inputSel);
  const input = (await page.$(inputSel)) as ElementHandle<HTMLInputElement> | null;
  if (!input) throw new Error('add-logo file input not found');
  await input.uploadFile(filePath);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-cut-tool"]');
};
