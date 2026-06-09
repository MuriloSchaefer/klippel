/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const ELECTIVE_ITEM_TESTID = 'elective-item';
export const ELECTIVE_ITEM_EDIT_TESTID = 'elective-item-edit';
export const ELECTIVE_ITEM_DELETE_TESTID = 'elective-item-delete';
export const ELECTIVE_ITEM_VALUE_TESTID = 'elective-item-value';

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

export const waitForElectiveItemRemoved = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label), { hidden: true });
};

/** Set an elective's runtime value switch (on/off) by label. The Switch input has
 * pointer-events:none under the track, so toggle via focus + Space (per e2e rules). */
export const setElectiveValue = async (page: Page, label: string, target: boolean) => {
  const inputSel = `${rowSelector(label)} [data-testid="${ELECTIVE_ITEM_VALUE_TESTID}"] input[type="checkbox"]`;
  await page.waitForSelector(inputSel);
  const checked = await page.$eval(inputSel, (el) => (el as HTMLInputElement).checked);
  if (checked === target) return;
  await page.focus(inputSel);
  await page.keyboard.press('Space');
  await page.waitForSelector(target ? `${inputSel}:checked` : `${inputSel}:not(:checked)`);
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
