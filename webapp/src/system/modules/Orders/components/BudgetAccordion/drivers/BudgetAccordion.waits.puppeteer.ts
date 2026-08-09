/* istanbul ignore file */
/**
 * Selectors and state waits shared by the click and shortcut budget drivers.
 *
 * Lives outside `*.click.puppeteer.ts` on purpose: a shortcut driver must not
 * import the click driver (e2e-tests.md §5), but both paths still need to wait
 * for the same rendered outcome. Waits only — no interaction lives here.
 */
import type { Page } from 'puppeteer-core';

export const BUDGET_ACCORDION_NAME = 'Orçamento';

export const BUDGET_ACCORDION_TESTID = 'budget-accordion';
export const CREATE_BUDGET_TRIGGER_TESTID = 'create-budget';
export const CREATE_BUDGET_FORM_TESTID = 'create-budget-form';
export const BUDGET_NAME_TESTID = 'budget-name';

export const ADD_TO_BUDGET_TRIGGER_TESTID = 'add-to-budget';
export const ADD_TO_BUDGET_FORM_TESTID = 'add-to-budget-form';
export const BUDGET_SELECTOR_TESTID = 'budget-selector';

export const REMOVE_FROM_BUDGET_TESTID = 'remove-from-budget';
export const DELETE_BUDGET_TESTID = 'delete-budget';

export const ACCORDION_ROOT = `[data-testid="${BUDGET_ACCORDION_TESTID}"]`;

/** Wait for the accordion to show the budget named `label` (belongs branch). */
export const waitForBudgetHeader = async (page: Page, label: string) => {
  await page.waitForSelector(`${ACCORDION_ROOT}[data-budget-label="${label}"]`);
};

/** Wait for the accordion to show the Criar / Adicionar branch. */
export const waitForBudgetActions = async (page: Page) => {
  await page.waitForSelector('#budget-actions');
};

/** Wait until the current budget holds exactly `n` items. */
export const waitForBudgetItemCount = async (page: Page, n: number) => {
  await page.waitForSelector(`${ACCORDION_ROOT}[data-budget-item-count="${n}"]`);
};

/** Wait until the store holds exactly `n` budgets. */
export const waitForBudgetCount = async (page: Page, n: number) => {
  await page.waitForSelector(`${ACCORDION_ROOT}[data-budget-count="${n}"]`);
};

export const itemRowSelector = (label: string) =>
  `[data-testid="budget-item"][data-budget-item-label="${label}"]`;

/**
 * Wait until the row for `label` shows `amount` garments — the sum of its grade
 * curve, which is the only place a line's quantity comes from.
 */
export const waitForItemAmount = async (
  page: Page,
  label: string,
  amount: number,
) => {
  await page.waitForSelector(
    `${itemRowSelector(label)}[data-budget-item-amount="${amount}"]`,
  );
};

/** Read a row's rendered total cost (empty string when the line is unpriced). */
export const readItemTotal = async (page: Page, label: string) =>
  page.$eval(
    itemRowSelector(label),
    (el) => (el as HTMLElement).dataset.budgetItemTotal ?? "",
  );
