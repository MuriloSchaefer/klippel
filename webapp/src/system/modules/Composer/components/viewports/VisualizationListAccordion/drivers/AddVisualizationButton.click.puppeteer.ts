/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const ADD_VISUALIZATION_TRIGGER_TESTID = 'add-visualization';
export const ADD_VISUALIZATION_FORM_TESTID = 'add-visualization-form';
export const ADD_VISUALIZATION_NAME_TESTID = 'add-visualization-name';
export const ADD_VISUALIZATION_MATERIAL_SELECT_TESTID =
  'add-visualization-material-select';
export const ADD_VISUALIZATION_DOM_INPUT_TESTID = 'add-visualization-dom-input';
export const ADD_VISUALIZATION_DOM_ADD_TESTID = 'add-visualization-dom-add';
export const ADD_VISUALIZATION_CONFIRM_TESTID = 'add-visualization-confirm';

const formInputSelector = (testid: string) =>
  `[data-testid="${ADD_VISUALIZATION_FORM_TESTID}"] [data-testid="${testid}"] input, [data-testid="${ADD_VISUALIZATION_FORM_TESTID}"] [data-testid="${testid}"] textarea`;

export const openAddVisualizationPanel = async (page: Page) => {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForSelector(
    `[data-testid="${ADD_VISUALIZATION_TRIGGER_TESTID}"]`,
  );
  await page.click(`[data-testid="${ADD_VISUALIZATION_TRIGGER_TESTID}"]`);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ADD_VISUALIZATION_FORM_TESTID}"]`,
  );
};

export const typeAddVisualizationName = async (page: Page, name: string) => {
  const sel = formInputSelector(ADD_VISUALIZATION_NAME_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, name);
};

export const selectAddVisualizationMaterial = async (
  page: Page,
  materialLabel: string,
) => {
  const selectSel = `[data-testid="${ADD_VISUALIZATION_FORM_TESTID}"] [data-testid="${ADD_VISUALIZATION_MATERIAL_SELECT_TESTID}"]`;
  await page.waitForSelector(selectSel);
  await page.click(selectSel);
  const optionSel = `[role="listbox"] [data-testid="add-visualization-material-option-${materialLabel}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

export const addDomIdToVisualization = async (page: Page, domId: string) => {
  const inputSel = formInputSelector(ADD_VISUALIZATION_DOM_INPUT_TESTID);
  await page.waitForSelector(inputSel);
  await page.click(inputSel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(inputSel, domId);
  await page.click(
    `[data-testid="${ADD_VISUALIZATION_FORM_TESTID}"] [data-testid="${ADD_VISUALIZATION_DOM_ADD_TESTID}"]`,
  );
  await page.waitForSelector(
    `[data-testid="${ADD_VISUALIZATION_FORM_TESTID}"] [data-testid="add-visualization-dom"][data-dom-id="${domId}"]`,
  );
};

const setDomSwitch = async (
  page: Page,
  domId: string,
  field: 'fill' | 'stroke',
  target: boolean,
) => {
  const sel = `[data-testid="${ADD_VISUALIZATION_FORM_TESTID}"] [data-testid="add-visualization-dom-${field}-${domId}"]`;
  await page.waitForSelector(sel);
  const checked = await page.$eval(
    sel,
    (el) => (el as HTMLInputElement).checked,
  );
  if (checked !== target) {
    await page.click(sel);
  }
};

export const setAddVisualizationDomFill = (
  page: Page,
  domId: string,
  on: boolean,
) => setDomSwitch(page, domId, 'fill', on);

export const setAddVisualizationDomStroke = (
  page: Page,
  domId: string,
  on: boolean,
) => setDomSwitch(page, domId, 'stroke', on);
