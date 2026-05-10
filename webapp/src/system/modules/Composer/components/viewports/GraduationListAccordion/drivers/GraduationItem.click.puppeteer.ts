/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const GRADUATION_ITEM_TESTID = 'graduation-item';
export const GRADUATION_ITEM_EDIT_TESTID = 'graduation-item-edit';
export const GRADUATION_ITEM_DELETE_TESTID = 'graduation-item-delete';
export const GRADUATION_ITEM_MOVE_UP_TESTID = 'graduation-item-move-up';
export const GRADUATION_ITEM_MOVE_DOWN_TESTID = 'graduation-item-move-down';
export const GRADUATION_ITEM_SAVE_TESTID = 'graduation-item-save';
export const GRADUATION_ITEM_CANCEL_TESTID = 'graduation-item-cancel';

export const EDIT_GRADUATION_FORM_TESTID = 'edit-graduation-form';
export const EDIT_GRADUATION_LABEL_TESTID = 'edit-graduation-label';
export const EDIT_GRADUATION_AMOUNT_TESTID = 'edit-graduation-amount';

const rowSelector = (label: string) =>
  `[data-testid="${GRADUATION_ITEM_TESTID}"][data-graduation-label="${label}"]`;

const inputInside = (rowSel: string, fieldTestId: string) =>
  `${rowSel} [data-testid="${fieldTestId}"] input, ${rowSel} [data-testid="${fieldTestId}"] textarea`;

export const waitForGraduationItem = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label));
};

export const waitForGraduationItemRemoved = async (
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

const clickActionInRow = async (
  page: Page,
  label: string,
  actionTestId: string,
) => {
  const sel = `${rowSelector(label)} [data-testid="${actionTestId}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
};

export const clickEditGraduation = (page: Page, label: string) =>
  clickActionInRow(page, label, GRADUATION_ITEM_EDIT_TESTID);
export const clickDeleteGraduation = (page: Page, label: string) =>
  clickActionInRow(page, label, GRADUATION_ITEM_DELETE_TESTID);
export const clickMoveGraduationUp = (page: Page, label: string) =>
  clickActionInRow(page, label, GRADUATION_ITEM_MOVE_UP_TESTID);
export const clickMoveGraduationDown = (page: Page, label: string) =>
  clickActionInRow(page, label, GRADUATION_ITEM_MOVE_DOWN_TESTID);
export const clickSaveGraduation = (page: Page, label: string) =>
  clickActionInRow(page, label, GRADUATION_ITEM_SAVE_TESTID);
export const clickCancelGraduation = (page: Page, label: string) =>
  clickActionInRow(page, label, GRADUATION_ITEM_CANCEL_TESTID);

export const typeEditLabel = async (page: Page, currentLabel: string, newLabel: string) => {
  const sel = inputInside(rowSelector(currentLabel), EDIT_GRADUATION_LABEL_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(newLabel);
};

export const typeEditAmount = async (page: Page, label: string, amount: number) => {
  const sel = inputInside(rowSelector(label), EDIT_GRADUATION_AMOUNT_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.press('Delete');
  await page.keyboard.type(String(amount));
};

export const waitForEditGraduationFormClosed = async (page: Page) => {
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="edit-graduation-form"]'),
    { timeout: 5_000 },
  );
};
