/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';

import {
  ADD_TO_BUDGET_FORM_TESTID,
  ADD_TO_BUDGET_TRIGGER_TESTID,
  BUDGET_NAME_TESTID,
  BUDGET_SELECTOR_TESTID,
  CREATE_BUDGET_FORM_TESTID,
  CREATE_BUDGET_TRIGGER_TESTID,
  DELETE_BUDGET_TESTID,
  REMOVE_FROM_BUDGET_TESTID,
  itemRowSelector,
  waitForItemAmount,
} from './BudgetAccordion.waits.puppeteer';

export * from './BudgetAccordion.waits.puppeteer';

/** Open the "Criar orçamento" pointer panel. Programmatic click for the same
 * reason as the other accordion drivers: a still-mounted Modal portal from a
 * closed `PointerContainer` can swallow a real click (e2e-tests.md §5). */
export const openCreateBudgetPanel = async (page: Page) => {
  const trigger = `[data-testid="${CREATE_BUDGET_TRIGGER_TESTID}"]`;
  const formSel = `[role="pointer-panel-content"] [data-testid="${CREATE_BUDGET_FORM_TESTID}"]`;

  await resetUIState(page);
  await page.waitForSelector(trigger);
  await page.$eval(trigger, (el) => (el as HTMLElement).click());
  await page.waitForSelector(formSel);
};

export const typeBudgetName = async (page: Page, label: string) => {
  const sel = `[data-testid="${CREATE_BUDGET_FORM_TESTID}"] [data-testid="${BUDGET_NAME_TESTID}"] input`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, label);
};

/** Pick the budget colour. `hex` must match one of `COLOR_PICKER_PRESETS`;
 * anything else goes through the native colour input, which cannot be driven
 * from puppeteer, so it is set on the input directly. */
export const pickBudgetColor = async (page: Page, hex: string) => {
  const swatchTrigger = `[data-testid="${CREATE_BUDGET_FORM_TESTID}"] [data-testid="color-picker"]`;
  await page.waitForSelector(swatchTrigger);
  await page.$eval(swatchTrigger, (el) => (el as HTMLElement).click());
  await page.waitForSelector('[data-testid="color-picker-dialog"]');

  const preset = `[data-testid="color-swatch-${hex}"]`;
  const hasPreset = await page.$(preset);
  if (hasPreset) {
    await page.$eval(preset, (el) => (el as HTMLElement).click());
  } else {
    await page.$eval(
      '[data-testid="color-custom"]',
      (el, value) => {
        const input = el as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )?.set;
        setter?.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      },
      hex,
    );
  }
  // The trigger mirrors the chosen colour, so this is a selector wait.
  await page.waitForSelector(`[data-testid="color-picker"][data-color="${hex}"]`);
};

export const openAddToBudgetPanel = async (page: Page) => {
  const trigger = `[data-testid="${ADD_TO_BUDGET_TRIGGER_TESTID}"]`;
  const formSel = `[role="pointer-panel-content"] [data-testid="${ADD_TO_BUDGET_FORM_TESTID}"]`;

  await resetUIState(page);
  await page.waitForSelector(trigger);
  await page.$eval(trigger, (el) => (el as HTMLElement).click());
  await page.waitForSelector(formSel);
};

/** Pick a budget in the `BudgetSelector` by its visible label. */
export const selectBudgetByLabel = async (page: Page, label: string) => {
  const selectSel = `[data-testid="${ADD_TO_BUDGET_FORM_TESTID}"] [data-testid="${BUDGET_SELECTOR_TESTID}"] [role="combobox"]`;
  await page.click(selectSel);

  const option = `[role="option"][data-budget-option-label="${label}"]`;
  await page.waitForSelector(option);
  await page.click(option);
  // Selection lands on the combobox before the panel is confirmed.
  await page.waitForSelector(
    `[data-testid="${BUDGET_SELECTOR_TESTID}"][data-budget-value="${label}"]`,
  );
  // The listbox popover renders its own Modal over the pointer panel. Until it
  // is torn down it swallows the hit-test, so a following confirm click never
  // reaches the button — wait it out rather than clicking into a backdrop.
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

/**
 * Set a budget line's amount. The field commits on blur, so the driver types
 * and then presses Enter (which blurs) rather than relying on `change`.
 */
export const setItemAmount = async (
  page: Page,
  label: string,
  amount: number,
) => {
  // The amount field is a native `input` carrying the testid itself (the MUI
  // TextField wrapper was dropped for render cost), so there is no inner input.
  const sel = `${itemRowSelector(label)} [data-testid="budget-item-amount"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, String(amount));
  await page.keyboard.press('Enter');
  await waitForItemAmount(page, label, amount);
};

export const clickRemoveFromBudget = async (page: Page) => {
  const sel = `[data-testid="${REMOVE_FROM_BUDGET_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.$eval(sel, (el) => (el as HTMLElement).click());
};

export const openDeleteBudgetPanel = async (page: Page) => {
  const sel = `[data-testid="${DELETE_BUDGET_TESTID}"]`;
  await resetUIState(page);
  await page.waitForSelector(sel);
  await page.$eval(sel, (el) => (el as HTMLElement).click());
  await page.waitForSelector('[role="pointer-panel-content"]');
};
