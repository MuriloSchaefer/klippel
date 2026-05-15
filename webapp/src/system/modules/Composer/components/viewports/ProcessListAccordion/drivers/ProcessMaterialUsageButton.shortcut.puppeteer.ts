/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  LINK_MATERIAL_FORM_TESTID,
  LINK_MATERIAL_SELECT_TESTID,
  LINK_MATERIAL_ADD_TESTID,
  LINK_MATERIAL_GRADE_ACCORDION_SUMMARY_TESTID,
  LINK_MATERIAL_GRADE_ROW_TESTID,
  LINK_MATERIAL_GRADE_SWITCH_TESTID,
  LINK_MATERIAL_GRADE_CONSUMPTION_TESTID,
} from './ProcessMaterialUsageButton.click.puppeteer';

const gradeRowSelector = (gradLabel: string) =>
  `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_GRADE_ROW_TESTID}"][data-graduation-label="${gradLabel}"]`;

export const LINK_MATERIAL_SHORTCUT = 'm' as const;

export const triggerLinkMaterialFromFocused = async (page: Page) => {
  await page.keyboard.press(LINK_MATERIAL_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_FORM_TESTID}"]`,
  );
};

export const selectLinkMaterialOptionByKeyboard = async (
  page: Page,
  materialLabel: string,
) => {
  await page.evaluate((id: string) => {
    const node = document.querySelector<HTMLElement>(
      `[role="pointer-panel-content"] [data-testid="${id}"]`,
    );
    node?.focus();
  }, LINK_MATERIAL_SELECT_TESTID);

  await page.keyboard.press('ArrowDown');
  const optionSel = `[role="listbox"] [data-testid="link-material-option-${materialLabel}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

export const expandGradeAccordionFromFocused = async (page: Page) => {
  const summarySel = `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_GRADE_ACCORDION_SUMMARY_TESTID}"]`;
  await page.waitForSelector(summarySel);
  const expanded = await page.$eval(
    summarySel,
    (el) => el.getAttribute('aria-expanded') === 'true',
  );
  if (!expanded) {
    await page.focus(summarySel);
    await page.keyboard.press('Enter');
  }
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_GRADE_ROW_TESTID}"]`,
  );
};

export const toggleGradeOverrideFromFocused = async (
  page: Page,
  gradLabel: string,
) => {
  const sel = `${gradeRowSelector(gradLabel)} [data-testid="${LINK_MATERIAL_GRADE_SWITCH_TESTID}"] input[type="checkbox"]`;
  await page.waitForSelector(sel);
  await page.focus(sel);
  await page.keyboard.press('Space');
  await page.waitForSelector(`${sel}:checked`);
};

export const setGradeQuotientFromFocused = async (
  page: Page,
  gradLabel: string,
  quotientAmount: number,
) => {
  const inputSel = `${gradeRowSelector(gradLabel)} [data-testid="${LINK_MATERIAL_GRADE_CONSUMPTION_TESTID}"] input[type="number"]`;
  await page.waitForSelector(inputSel);
  await page.evaluate((s: string) => {
    const inputs = document.querySelectorAll<HTMLInputElement>(s);
    const input = inputs[0];
    if (!input) return;
    input.focus();
    input.select();
  }, inputSel);
  await page.keyboard.press('Delete');
  await page.keyboard.type(String(quotientAmount));
};

export const submitLinkMaterialFromFocused = async (page: Page) => {
  // The "Adicionar" button is reachable by Tab after the material Select. The
  // form has the Select, then a CompoundSelector (multiple inputs), then the
  // button. We avoid Tab-counting and submit via Enter on a focused button.
  const sel = `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_FORM_TESTID}"] [data-testid="${LINK_MATERIAL_ADD_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.focus(sel);
  await page.keyboard.press('Enter');
};
