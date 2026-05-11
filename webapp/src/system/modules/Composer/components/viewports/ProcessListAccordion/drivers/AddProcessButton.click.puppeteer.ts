/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const ADD_PROCESS_TRIGGER_TESTID = 'add-process';
export const ADD_PROCESS_FORM_TESTID = 'add-process-form';
export const ADD_PROCESS_NAME_TESTID = 'add-process-name';
export const ADD_PROCESS_COST_TIME_TESTID = 'add-process-cost-time';
export const ADD_PROCESS_COST_MONEY_TESTID = 'add-process-cost-money';
export const ADD_PROCESS_CONFIRM_TESTID = 'add-process-confirm';

const formInputSelector = (testid: string) =>
  `[data-testid="${ADD_PROCESS_FORM_TESTID}"] [data-testid="${testid}"] input, [data-testid="${ADD_PROCESS_FORM_TESTID}"] [data-testid="${testid}"] textarea`;

const compoundAmountSelector = (groupTestid: string, position: 'quotient' | 'dividend') => {
  const idx = position === 'quotient' ? 0 : 1;
  return { groupTestid, idx };
};

export const openAddProcessPanel = async (page: Page) => {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForSelector(`[data-testid="${ADD_PROCESS_TRIGGER_TESTID}"]`);
  await page.click(`[data-testid="${ADD_PROCESS_TRIGGER_TESTID}"]`);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ADD_PROCESS_FORM_TESTID}"]`,
  );
};

export const typeAddProcessName = async (page: Page, name: string) => {
  const sel = formInputSelector(ADD_PROCESS_NAME_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, name);
};

const setCompoundAmount = async (
  page: Page,
  groupTestid: string,
  position: 'quotient' | 'dividend',
  amount: number,
) => {
  const { idx } = compoundAmountSelector(groupTestid, position);
  const sel = `[data-testid="${ADD_PROCESS_FORM_TESTID}"] [data-testid="${groupTestid}"] input[type="number"]`;
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

export const setAddProcessCostTime = async (
  page: Page,
  costs: { quotientAmount?: number; dividendAmount?: number },
) => {
  if (costs.quotientAmount !== undefined) {
    await setCompoundAmount(
      page,
      ADD_PROCESS_COST_TIME_TESTID,
      'quotient',
      costs.quotientAmount,
    );
  }
  if (costs.dividendAmount !== undefined) {
    await setCompoundAmount(
      page,
      ADD_PROCESS_COST_TIME_TESTID,
      'dividend',
      costs.dividendAmount,
    );
  }
};

export const setAddProcessCostMoney = async (
  page: Page,
  costs: { quotientAmount?: number; dividendAmount?: number },
) => {
  if (costs.quotientAmount !== undefined) {
    await setCompoundAmount(
      page,
      ADD_PROCESS_COST_MONEY_TESTID,
      'quotient',
      costs.quotientAmount,
    );
  }
  if (costs.dividendAmount !== undefined) {
    await setCompoundAmount(
      page,
      ADD_PROCESS_COST_MONEY_TESTID,
      'dividend',
      costs.dividendAmount,
    );
  }
};
