/* istanbul ignore file */
/**
 * Keyboard-only budget flows. Imports nothing from the click driver
 * (e2e-tests.md §5) — shared selectors and waits live in
 * `BudgetAccordion.waits.puppeteer.ts`.
 */
import type { Page } from 'puppeteer-core';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';

import {
  ADD_TO_BUDGET_FORM_TESTID,
  BUDGET_ACCORDION_NAME,
  BUDGET_NAME_TESTID,
  BUDGET_SELECTOR_TESTID,
  CREATE_BUDGET_FORM_TESTID,
} from './BudgetAccordion.waits.puppeteer';

export * from './BudgetAccordion.waits.puppeteer';

/** Ctrl+Alt+O — expands the Orçamento accordion and focuses its first row. */
export const triggerFocusBudgetAccordion = async (page: Page) => {
  await resetUIState(page);
  await page.keyboard.down('Control');
  await page.keyboard.down('Alt');
  await page.keyboard.press('o');
  await page.keyboard.up('Alt');
  await page.keyboard.up('Control');
  const accordion = `[role="accordion-${BUDGET_ACCORDION_NAME}"]`;
  await page.waitForSelector(`${accordion}[data-accordion-state="entered"]`);
  // `data-accordion-state="entered"` is set *before* `focusOnOpen` runs, so the
  // wait above can resolve a tick early. The "c"/"a" shortcuts only fire while
  // focus is inside the accordion (FocusShortcutProvider pushes the context on
  // focus), so pressing one now would silently do nothing — wait for focus to
  // actually land.
  await page.waitForSelector(`${accordion} :focus`);
};

/** "c" inside the budget accordion context — opens the create panel. */
export const triggerCreateBudget = async (page: Page) => {
  await page.keyboard.press('c');
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${CREATE_BUDGET_FORM_TESTID}"]`,
  );
};

/** "a" inside the budget accordion context — opens the add-to panel. */
export const triggerAddToBudget = async (page: Page) => {
  await page.keyboard.press('a');
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ADD_TO_BUDGET_FORM_TESTID}"]`,
  );
};

/** Type into the create form's name field without clicking it — the panel
 * autofocuses it on open. */
export const typeBudgetNameFromFocused = async (page: Page, label: string) => {
  const sel = `[data-testid="${CREATE_BUDGET_FORM_TESTID}"] [data-testid="${BUDGET_NAME_TESTID}"] input`;
  await page.waitForSelector(`${sel}:focus`);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(label);
};

/**
 * Choose a budget with the keyboard only: open the listbox off the focused
 * combobox, walk to the option with `label` using MUI's type-ahead, then
 * commit with Enter. `:focus` on the option is what tells us type-ahead
 * landed, so this stays a selector wait rather than a DOM poll.
 */
export const selectBudgetByLabelShortcut = async (page: Page, label: string) => {
  const combobox = `[data-testid="${BUDGET_SELECTOR_TESTID}"] [role="combobox"]`;
  await page.waitForSelector(`${combobox}:focus`);
  await page.keyboard.press('Enter');
  await page.waitForSelector('[role="listbox"]');

  await page.keyboard.type(label);
  const option = `[role="option"][data-budget-option-label="${label}"]`;
  await page.waitForSelector(`${option}:focus`);
  await page.keyboard.press('Enter');

  await page.waitForSelector(
    `[data-testid="${BUDGET_SELECTOR_TESTID}"][data-budget-value="${label}"]`,
  );
};
