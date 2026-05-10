/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  ADD_VISUALIZATION_DOM_INPUT_TESTID,
  ADD_VISUALIZATION_FORM_TESTID,
  ADD_VISUALIZATION_MATERIAL_SELECT_TESTID,
  ADD_VISUALIZATION_NAME_TESTID,
} from './AddVisualizationButton.click.puppeteer';

export const ADD_VISUALIZATION_SHORTCUT = 'a' as const;

const focusFormField = async (page: Page, testid: string) => {
  await page.evaluate((id: string) => {
    const node = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      `[role="pointer-panel-content"] [data-testid="${id}"] input, [role="pointer-panel-content"] [data-testid="${id}"] textarea`,
    );
    node?.focus();
  }, testid);
};

export const triggerAddVisualization = async (page: Page) => {
  // 'a' is contextual: only fires when focus is inside the Visualização list.
  await page.keyboard.press(ADD_VISUALIZATION_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ADD_VISUALIZATION_FORM_TESTID}"]`,
  );
};

export const typeAddVisualizationNameFromFocused = async (
  page: Page,
  name: string,
) => {
  await focusFormField(page, ADD_VISUALIZATION_NAME_TESTID);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(name);
};

export const selectAddVisualizationMaterialByKeyboard = async (
  page: Page,
  materialLabel: string,
) => {
  await page.evaluate((id: string) => {
    const node = document.querySelector<HTMLElement>(
      `[role="pointer-panel-content"] [data-testid="${id}"]`,
    );
    node?.focus();
  }, ADD_VISUALIZATION_MATERIAL_SELECT_TESTID);
  
  await page.keyboard.press('ArrowDown');
  const optionSel = `[role="listbox"] [data-testid="add-visualization-material-option-${materialLabel}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

export const addDomIdToVisualizationFromFocused = async (
  page: Page,
  domId: string,
) => {
  await focusFormField(page, ADD_VISUALIZATION_DOM_INPUT_TESTID);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(domId);
  await page.keyboard.press('Enter');
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="add-visualization-dom"][data-dom-id="${domId}"]`,
  );
};

const setDomSwitchShortcut = async (
  page: Page,
  domId: string,
  field: 'fill' | 'stroke',
  target: boolean,
) => {
  const sel = `[role="pointer-panel-content"] [data-testid="add-visualization-dom-${field}-${domId}"]`;
  await page.waitForSelector(sel);
  const checked = await page.$eval(
    sel,
    (el) => (el as HTMLInputElement).checked,
  );
  if (checked === target) return;
  await page.click(sel);
};

export const setAddVisualizationDomFillShortcut = (
  page: Page,
  domId: string,
  on: boolean,
) => setDomSwitchShortcut(page, domId, 'fill', on);

export const setAddVisualizationDomStrokeShortcut = (
  page: Page,
  domId: string,
  on: boolean,
) => setDomSwitchShortcut(page, domId, 'stroke', on);
