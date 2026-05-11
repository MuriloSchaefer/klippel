/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const ELECTIVE_ITEM_TESTID = 'elective-item';
export const ELECTIVE_ITEM_EDIT_TESTID = 'elective-item-edit';
export const ELECTIVE_ITEM_DELETE_TESTID = 'elective-item-delete';

export const EDIT_ELECTIVE_FORM_TESTID = 'edit-elective-form';
export const EDIT_ELECTIVE_NAME_TESTID = 'edit-elective-name';
export const EDIT_ELECTIVE_DEFAULT_TESTID = 'edit-elective-default';
export const EDIT_ELECTIVE_CONFIRM_TESTID = 'edit-elective-confirm';

const rowSelector = (label: string) =>
  `[data-testid="${ELECTIVE_ITEM_TESTID}"][data-elective-label="${label}"]`;

const editFormInputSelector = (testid: string) =>
  `[role="pointer-panel-content"] [data-testid="${EDIT_ELECTIVE_FORM_TESTID}"] [data-testid="${testid}"] input, [role="pointer-panel-content"] [data-testid="${EDIT_ELECTIVE_FORM_TESTID}"] [data-testid="${testid}"] textarea`;

export const waitForElectiveItem = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label));
};

export const waitForElectiveItemRemoved = async (
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

export const clickEditElective = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${ELECTIVE_ITEM_EDIT_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${EDIT_ELECTIVE_FORM_TESTID}"]`,
  );
};

export const clickDeleteElective = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${ELECTIVE_ITEM_DELETE_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
};

export const typeEditElectiveName = async (page: Page, name: string) => {
  const sel = editFormInputSelector(EDIT_ELECTIVE_NAME_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, name);
};

export const setEditElectiveDefault = async (page: Page, target: boolean) => {
  const sel = `[role="pointer-panel-content"] [data-testid="${EDIT_ELECTIVE_FORM_TESTID}"] [data-testid="${EDIT_ELECTIVE_DEFAULT_TESTID}"] input`;
  await page.waitForSelector(sel);
  const checked = await page.$eval(
    sel,
    (el) => (el as HTMLInputElement).checked,
  );
  if (checked !== target) {
    await page.click(sel);
  }
};
