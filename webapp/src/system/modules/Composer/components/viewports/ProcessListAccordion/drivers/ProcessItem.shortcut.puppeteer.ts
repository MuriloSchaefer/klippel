/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  EDIT_PROCESS_COST_MONEY_TESTID,
  EDIT_PROCESS_COST_TIME_TESTID,
  EDIT_PROCESS_FORM_TESTID,
  EDIT_PROCESS_NAME_TESTID,
  PROCESS_ITEM_TESTID,
} from './ProcessItem.click.puppeteer';

export const FOCUS_PROCESS_LIST_SHORTCUT = {
  ctrl: true,
  alt: true,
  key: 'r',
} as const;
export const FOCUS_NEXT_PROCESS_SHORTCUT = 'ArrowDown' as const;
export const FOCUS_PREV_PROCESS_SHORTCUT = 'ArrowUp' as const;
export const EDIT_PROCESS_SHORTCUT = 'e' as const;
export const DELETE_PROCESS_SHORTCUT = 'd' as const;

const rowSelector = (label: string) =>
  `[data-testid="${PROCESS_ITEM_TESTID}"][data-process-label="${label}"]`;

const focusEditFormField = async (page: Page, testid: string) => {
  await page.evaluate((id: string) => {
    const node = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      `[role="pointer-panel-content"] [data-testid="edit-process-form"] [data-testid="${id}"] input, [role="pointer-panel-content"] [data-testid="edit-process-form"] [data-testid="${id}"] textarea`,
    );
    node?.focus();
  }, testid);
};

export const focusProcessItem = async (page: Page, label: string) => {
  const sel = rowSelector(label);
  await page.waitForSelector(sel);
  await page.focus(sel);
  await page.waitForSelector(`${sel}:focus`);
};

export const triggerFocusProcessList = async (page: Page) => {
  await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (a?.matches('[data-testid="process-item"]')) a.blur();
  });
  await page.keyboard.down('Control');
  await page.keyboard.down('Alt');
  await page.keyboard.press('r');
  await page.keyboard.up('Alt');
  await page.keyboard.up('Control');
  await page.waitForSelector(
    '[data-testid="process-item"]:focus, #composer-add-process:focus, [data-accordion-content="Processos da Peça"]:focus',
  );
};

export const triggerFocusNextProcess = async (page: Page) => {
  await page.keyboard.press(FOCUS_NEXT_PROCESS_SHORTCUT);
};

export const triggerFocusPrevProcess = async (page: Page) => {
  await page.keyboard.press(FOCUS_PREV_PROCESS_SHORTCUT);
};

export const triggerEditProcessFromFocused = async (page: Page) => {
  await page.keyboard.press(EDIT_PROCESS_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${EDIT_PROCESS_FORM_TESTID}"]`,
  );
};

export const triggerDeleteProcessFromFocused = async (page: Page) => {
  await page.keyboard.press(DELETE_PROCESS_SHORTCUT);
};

export const typeEditProcessNameFromFocused = async (
  page: Page,
  name: string,
) => {
  await focusEditFormField(page, EDIT_PROCESS_NAME_TESTID);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(name);
};

const setEditCompoundAmountFromFocused = async (
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
};

export const setEditProcessCostTimeFromFocused = async (
  page: Page,
  costs: { quotientAmount?: number; dividendAmount?: number },
) => {
  if (costs.quotientAmount !== undefined) {
    await setEditCompoundAmountFromFocused(
      page,
      EDIT_PROCESS_COST_TIME_TESTID,
      'quotient',
      costs.quotientAmount,
    );
  }
  if (costs.dividendAmount !== undefined) {
    await setEditCompoundAmountFromFocused(
      page,
      EDIT_PROCESS_COST_TIME_TESTID,
      'dividend',
      costs.dividendAmount,
    );
  }
};

export const setEditProcessCostMoneyFromFocused = async (
  page: Page,
  costs: { quotientAmount?: number; dividendAmount?: number },
) => {
  if (costs.quotientAmount !== undefined) {
    await setEditCompoundAmountFromFocused(
      page,
      EDIT_PROCESS_COST_MONEY_TESTID,
      'quotient',
      costs.quotientAmount,
    );
  }
  if (costs.dividendAmount !== undefined) {
    await setEditCompoundAmountFromFocused(
      page,
      EDIT_PROCESS_COST_MONEY_TESTID,
      'dividend',
      costs.dividendAmount,
    );
  }
};

export type FocusedProcessListTarget =
  | { type: 'process-item'; label: string | null }
  | { type: 'add-process-button' }
  | { type: 'unknown'; tag: string }
  | null;

export const getFocusedProcessListTarget = async (
  page: Page,
): Promise<FocusedProcessListTarget> => {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return null;
    if (a.matches('[data-testid="process-item"]')) {
      return {
        type: 'process-item' as const,
        label: a.getAttribute('data-process-label'),
      };
    }
    if (a.id === 'composer-add-process') {
      return { type: 'add-process-button' as const };
    }
    return { type: 'unknown' as const, tag: a.tagName.toLowerCase() };
  });
};

export const getFocusedProcessLabel = async (
  page: Page,
): Promise<string | null> => {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a?.matches('[data-testid="process-item"]')) return null;
    return a.getAttribute('data-process-label');
  });
};
