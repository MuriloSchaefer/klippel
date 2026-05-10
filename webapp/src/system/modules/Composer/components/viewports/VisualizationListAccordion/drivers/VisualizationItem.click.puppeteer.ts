/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const VISUALIZATION_ITEM_TESTID = 'visualization-item';
export const VISUALIZATION_ITEM_EDIT_TESTID = 'visualization-item-edit';
export const VISUALIZATION_ITEM_DELETE_TESTID = 'visualization-item-delete';

export const EDIT_VISUALIZATION_FORM_TESTID = 'edit-visualization-form';
export const EDIT_VISUALIZATION_NAME_TESTID = 'edit-visualization-name';
export const EDIT_VISUALIZATION_MATERIAL_SELECT_TESTID =
  'edit-visualization-material-select';
export const EDIT_VISUALIZATION_DOM_INPUT_TESTID =
  'edit-visualization-dom-input';
export const EDIT_VISUALIZATION_DOM_ADD_TESTID = 'edit-visualization-dom-add';
export const EDIT_VISUALIZATION_CONFIRM_TESTID = 'edit-visualization-confirm';

const rowSelector = (label: string) =>
  `[data-testid="${VISUALIZATION_ITEM_TESTID}"][data-visualization-label="${label}"]`;

const editFormInputSelector = (testid: string) =>
  `[role="pointer-panel-content"] [data-testid="${EDIT_VISUALIZATION_FORM_TESTID}"] [data-testid="${testid}"] input, [role="pointer-panel-content"] [data-testid="${EDIT_VISUALIZATION_FORM_TESTID}"] [data-testid="${testid}"] textarea`;

export const waitForVisualizationItem = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label));
};

export const waitForVisualizationItemRemoved = async (
  page: Page,
  label: string,
  timeout = 5_000,
) => {
  await page.waitForFunction(
    (sel: string) => !document.querySelector(sel),
    { timeout },
    rowSelector(label),
  );
};

export const clickEditVisualization = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${VISUALIZATION_ITEM_EDIT_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${EDIT_VISUALIZATION_FORM_TESTID}"]`,
  );
};

export const clickDeleteVisualization = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${VISUALIZATION_ITEM_DELETE_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
};

export const typeEditVisualizationName = async (page: Page, name: string) => {
  const sel = editFormInputSelector(EDIT_VISUALIZATION_NAME_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, name);
};

export const selectEditVisualizationMaterial = async (
  page: Page,
  materialLabel: string,
) => {
  const selectSel = `[role="pointer-panel-content"] [data-testid="${EDIT_VISUALIZATION_FORM_TESTID}"] [data-testid="${EDIT_VISUALIZATION_MATERIAL_SELECT_TESTID}"]`;
  await page.waitForSelector(selectSel);
  await page.click(selectSel);
  const optionSel = `[role="listbox"] [data-testid="edit-visualization-material-option-${materialLabel}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

export const addDomIdToEditVisualization = async (
  page: Page,
  domId: string,
) => {
  const inputSel = editFormInputSelector(EDIT_VISUALIZATION_DOM_INPUT_TESTID);
  await page.waitForSelector(inputSel);
  await page.click(inputSel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(inputSel, domId);
  await page.click(
    `[role="pointer-panel-content"] [data-testid="${EDIT_VISUALIZATION_FORM_TESTID}"] [data-testid="${EDIT_VISUALIZATION_DOM_ADD_TESTID}"]`,
  );
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="edit-visualization-dom"][data-dom-id="${domId}"]`,
  );
};

export const removeDomFromEditVisualization = async (
  page: Page,
  domId: string,
) => {
  const sel = `[role="pointer-panel-content"] [data-testid="edit-visualization-dom-remove-${domId}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="edit-visualization-dom"][data-dom-id="${domId}"]`,
    { hidden: true },
  );
};

const setEditDomSwitch = async (
  page: Page,
  domId: string,
  field: 'fill' | 'stroke',
  target: boolean,
) => {
  const sel = `[role="pointer-panel-content"] [data-testid="edit-visualization-dom-${field}-${domId}"]`;
  await page.waitForSelector(sel);
  const checked = await page.$eval(
    sel,
    (el) => (el as HTMLInputElement).checked,
  );
  if (checked !== target) {
    await page.click(sel);
  }
};

export const setEditVisualizationDomFill = (
  page: Page,
  domId: string,
  on: boolean,
) => setEditDomSwitch(page, domId, 'fill', on);

export const setEditVisualizationDomStroke = (
  page: Page,
  domId: string,
  on: boolean,
) => setEditDomSwitch(page, domId, 'stroke', on);
