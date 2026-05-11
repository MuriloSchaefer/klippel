/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const PROCESS_ITEM_TESTID = 'process-item';
export const PROCESS_ITEM_EDIT_TESTID = 'process-item-edit';
export const PROCESS_ITEM_DELETE_TESTID = 'process-item-delete';

export const EDIT_PROCESS_FORM_TESTID = 'edit-process-form';
export const EDIT_PROCESS_NAME_TESTID = 'edit-process-name';
export const EDIT_PROCESS_COST_TIME_TESTID = 'edit-process-cost-time';
export const EDIT_PROCESS_COST_MONEY_TESTID = 'edit-process-cost-money';
export const EDIT_PROCESS_CONFIRM_TESTID = 'edit-process-confirm';

const rowSelector = (label: string) =>
  `[data-testid="${PROCESS_ITEM_TESTID}"][data-process-label="${label}"]`;

const editFormInputSelector = (testid: string) =>
  `[role="pointer-panel-content"] [data-testid="${EDIT_PROCESS_FORM_TESTID}"] [data-testid="${testid}"] input, [role="pointer-panel-content"] [data-testid="${EDIT_PROCESS_FORM_TESTID}"] [data-testid="${testid}"] textarea`;

export const waitForProcessItem = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label));
};

export const waitForProcessItemRemoved = async (
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

export const clickEditProcess = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${PROCESS_ITEM_EDIT_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${EDIT_PROCESS_FORM_TESTID}"]`,
  );
};

export const clickDeleteProcess = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${PROCESS_ITEM_DELETE_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
};

export const typeEditProcessName = async (page: Page, name: string) => {
  const sel = editFormInputSelector(EDIT_PROCESS_NAME_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, name);
};

const setEditCompoundAmount = async (
  page: Page,
  groupTestid: string,
  position: 'quotient' | 'dividend',
  amount: number,
) => {
  const idx = position === 'quotient' ? 0 : 1;
  const sel = `[role="pointer-panel-content"] [data-testid="${EDIT_PROCESS_FORM_TESTID}"] [data-testid="${groupTestid}"] input[type="number"]`;
  await page.waitForSelector(sel);
  await page.evaluate(
    (args: { s: string; i: number }) => {
      const inputs = document.querySelectorAll<HTMLInputElement>(args.s);
      const input = inputs[args.i];
      if (!input) return;
      input.focus();
      input.select();
    },
    { s: sel, i: idx },
  );
  await page.keyboard.press('Delete');
  await page.keyboard.type(String(amount));
  await page.keyboard.press('Tab');
};

export const setEditProcessCostTime = async (
  page: Page,
  costs: { quotientAmount?: number; dividendAmount?: number },
) => {
  if (costs.quotientAmount !== undefined) {
    await setEditCompoundAmount(
      page,
      EDIT_PROCESS_COST_TIME_TESTID,
      'quotient',
      costs.quotientAmount,
    );
  }
  if (costs.dividendAmount !== undefined) {
    await setEditCompoundAmount(
      page,
      EDIT_PROCESS_COST_TIME_TESTID,
      'dividend',
      costs.dividendAmount,
    );
  }
};

export const setEditProcessCostMoney = async (
  page: Page,
  costs: { quotientAmount?: number; dividendAmount?: number },
) => {
  if (costs.quotientAmount !== undefined) {
    await setEditCompoundAmount(
      page,
      EDIT_PROCESS_COST_MONEY_TESTID,
      'quotient',
      costs.quotientAmount,
    );
  }
  if (costs.dividendAmount !== undefined) {
    await setEditCompoundAmount(
      page,
      EDIT_PROCESS_COST_MONEY_TESTID,
      'dividend',
      costs.dividendAmount,
    );
  }
};
