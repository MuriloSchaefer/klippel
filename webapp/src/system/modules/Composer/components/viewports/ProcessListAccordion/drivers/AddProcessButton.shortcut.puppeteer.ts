/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  ADD_PROCESS_COST_MONEY_TESTID,
  ADD_PROCESS_COST_TIME_TESTID,
  ADD_PROCESS_FORM_TESTID,
  ADD_PROCESS_NAME_TESTID,
} from './AddProcessButton.click.puppeteer';

export const ADD_PROCESS_SHORTCUT = 'a' as const;

const focusFormField = async (page: Page, testid: string) => {
  await page.evaluate((id: string) => {
    const node = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      `[role="pointer-panel-content"] [data-testid="${id}"] input, [role="pointer-panel-content"] [data-testid="${id}"] textarea`,
    );
    node?.focus();
  }, testid);
};

export const triggerAddProcess = async (page: Page) => {
  await page.keyboard.press(ADD_PROCESS_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ADD_PROCESS_FORM_TESTID}"]`,
  );
};

export const typeAddProcessNameFromFocused = async (page: Page, name: string) => {
  await focusFormField(page, ADD_PROCESS_NAME_TESTID);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(name);
};

const setCompoundAmountFromFocused = async (
  page: Page,
  groupTestid: string,
  position: 'quotient' | 'dividend',
  amount: number,
) => {
  const idx = position === 'quotient' ? 0 : 1;
  const sel = `[role="pointer-panel-content"] [data-testid="${ADD_PROCESS_FORM_TESTID}"] [data-testid="${groupTestid}"] input[type="number"]`;
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
};

export const setAddProcessCostTimeFromFocused = async (
  page: Page,
  costs: { quotientAmount?: number; dividendAmount?: number },
) => {
  if (costs.quotientAmount !== undefined) {
    await setCompoundAmountFromFocused(
      page,
      ADD_PROCESS_COST_TIME_TESTID,
      'quotient',
      costs.quotientAmount,
    );
  }
  if (costs.dividendAmount !== undefined) {
    await setCompoundAmountFromFocused(
      page,
      ADD_PROCESS_COST_TIME_TESTID,
      'dividend',
      costs.dividendAmount,
    );
  }
};

export const setAddProcessCostMoneyFromFocused = async (
  page: Page,
  costs: { quotientAmount?: number; dividendAmount?: number },
) => {
  if (costs.quotientAmount !== undefined) {
    await setCompoundAmountFromFocused(
      page,
      ADD_PROCESS_COST_MONEY_TESTID,
      'quotient',
      costs.quotientAmount,
    );
  }
  if (costs.dividendAmount !== undefined) {
    await setCompoundAmountFromFocused(
      page,
      ADD_PROCESS_COST_MONEY_TESTID,
      'dividend',
      costs.dividendAmount,
    );
  }
};
