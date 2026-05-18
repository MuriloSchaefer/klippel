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

export const waitForProcessItemRemoved = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label), { hidden: true });
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
  // Scope by the UnitAmountSelector wrapper id so we target one specific
  // input instead of indexing into a list — the input we want never moves
  // between renders, even if MUI re-mounts the surrounding tree.
  const boxId = position === 'quotient' ? 'quotient-selector' : 'dividend-selector';
  const sel = `[role="pointer-panel-content"] [data-testid="${EDIT_PROCESS_FORM_TESTID}"] [data-testid="${groupTestid}"] #${boxId} input[type="number"]`;
  await page.waitForSelector(sel);
  const handle = await page.$(sel);
  if (!handle) throw new Error(`No input found for ${groupTestid}/${position}`);
  // ElementHandle.focus dispatches CDP focus, which is what page.keyboard
  // events route to — DOM-only input.focus() can race the CDP focus tracker.
  await handle.focus();
  await page.waitForSelector(`${sel}:focus`);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(String(amount));
  // Wait for React's controlled input to reflect the typed value before we
  // move on. Without this, a subsequent confirm-click can read state that
  // hasn't committed the last onChange yet. The HTML `value` attribute is
  // not reliably reflected on type=number, so we check the IDL property.
  await page.waitForFunction(
    (s: string, want: string) => {
      const input = document.querySelector<HTMLInputElement>(s);
      return !!input && input.value === want;
    },
    {},
    sel,
    String(amount),
  );
  // Blur via the input itself instead of Tab — Tab moves focus to the unit
  // Select, which can swallow events or open its listbox under certain MUI
  // focus-trap configurations.
  await handle.evaluate((el) => (el as HTMLInputElement).blur());
  await handle.dispose();
};

const setEditCompoundUnit = async (
  page: Page,
  groupTestid: string,
  position: 'quotient' | 'dividend',
  unitId: string,
) => {
  const boxId = position === 'quotient' ? 'quotient-selector' : 'dividend-selector';
  const comboSel = `[role="pointer-panel-content"] [data-testid="${EDIT_PROCESS_FORM_TESTID}"] [data-testid="${groupTestid}"] #${boxId} [role="combobox"]`;
  await page.waitForSelector(comboSel);
  await page.click(comboSel);
  const optionSel = `[role="listbox"] [data-value="${unitId}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

export const setEditProcessCostTime = async (
  page: Page,
  costs: {
    quotientAmount?: number;
    dividendAmount?: number;
    quotientUnit?: string;
    dividendUnit?: string;
  },
) => {
  // Units first: changing a unit runs through snapCostTime, which can reset
  // the amount on the side the user did not touch.
  if (costs.quotientUnit !== undefined) {
    await setEditCompoundUnit(
      page,
      EDIT_PROCESS_COST_TIME_TESTID,
      'quotient',
      costs.quotientUnit,
    );
  }
  if (costs.dividendUnit !== undefined) {
    await setEditCompoundUnit(
      page,
      EDIT_PROCESS_COST_TIME_TESTID,
      'dividend',
      costs.dividendUnit,
    );
  }
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
