/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export type UnitValue = { amount: number; unit: string };
export type CompoundValue = { quotient: UnitValue; dividend: UnitValue };

/**
 * Set both quotient and dividend (amount + unit id) of the
 * `[role="compound-selector"]` rendered inside `scopeSel`. Unit ids are the
 * `value` of each unit `MenuItem` (e.g. "kilogramas6", "unitario18") — MUI
 * exposes them as `data-value` on the listbox option.
 *
 * The amount inputs are driven by keyboard (focus + select + type), the unit
 * combobox is opened via a programmatic click on its trigger and the option
 * is picked the same way — same path the shortcut variants use, so this
 * helper is safe for both click and shortcut tools.
 */
export const setCompoundValue = async (
  page: Page,
  scopeSel: string,
  value: CompoundValue,
) => {
  const compoundSel = `${scopeSel} [role="compound-selector"]`;
  await page.waitForSelector(compoundSel);
  await setUnitAmount(page, compoundSel, 0, value.quotient);
  await setUnitAmount(page, compoundSel, 1, value.dividend);
};

const setUnitAmount = async (
  page: Page,
  compoundSel: string,
  idx: 0 | 1,
  value: UnitValue,
) => {
  const numericInputs = `${compoundSel} [role="unit-selector"] input[type="number"]`;
  await page.waitForSelector(numericInputs);
  await page.evaluate(
    (args: { s: string; i: number }) => {
      const inputs = document.querySelectorAll<HTMLInputElement>(args.s);
      const input = inputs[args.i];
      if (!input) return;
      input.focus();
      input.select();
    },
    { s: numericInputs, i: idx },
  );
  await page.keyboard.press('Delete');
  await page.keyboard.type(String(value.amount));
  await page.keyboard.press('Tab');

  // MUI Select opens on `mousedown` (not click) — dispatch the full sequence
  // on the Nth combobox trigger.
  const unitTriggers = `${compoundSel} [role="unit-selector"] [role="combobox"]`;
  await page.waitForSelector(unitTriggers);
  await page.evaluate(
    (args: { s: string; i: number }) => {
      const triggers = document.querySelectorAll<HTMLElement>(args.s);
      const trigger = triggers[args.i];
      if (!trigger) return;
      trigger.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
      );
      trigger.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }),
      );
      trigger.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
      );
    },
    { s: unitTriggers, i: idx },
  );
  const optionSel = `[role="listbox"] [data-value="${value.unit}"]`;
  await page.waitForSelector(optionSel);
  await page.$eval(optionSel, (el) => (el as HTMLElement).click());
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};
