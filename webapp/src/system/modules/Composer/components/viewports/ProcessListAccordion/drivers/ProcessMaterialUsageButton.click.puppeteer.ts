/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { PROCESS_ITEM_TESTID } from './ProcessItem.click.puppeteer';

export const PROCESS_ITEM_LINK_MATERIAL_TESTID = 'process-item-link-material';
export const LINK_MATERIAL_FORM_TESTID = 'link-material-form';
export const LINK_MATERIAL_SELECT_TESTID = 'link-material-select';
export const LINK_MATERIAL_ADD_TESTID = 'link-material-add';
export const LINK_MATERIAL_GRADE_ACCORDION_TESTID = 'link-material-grade-accordion';
export const LINK_MATERIAL_GRADE_ACCORDION_SUMMARY_TESTID = 'link-material-grade-accordion-summary';
export const LINK_MATERIAL_GRADE_ROW_TESTID = 'link-material-grade-row';
export const LINK_MATERIAL_GRADE_SWITCH_TESTID = 'link-material-grade-switch';
export const LINK_MATERIAL_GRADE_CONSUMPTION_TESTID = 'link-material-grade-consumption';
export const LINK_MATERIAL_AMOUNT_TESTID = 'link-material-amount';

export type { UnitValue, CompoundValue } from '@helpers/puppeteer/compoundSelector';
export { setCompoundValue } from '@helpers/puppeteer/compoundSelector';

const gradeRowSelector = (gradLabel: string) =>
  `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_GRADE_ROW_TESTID}"][data-graduation-label="${gradLabel}"]`;

const gradRowFormControl = (gradLabel: string) =>
  `${gradeRowSelector(gradLabel)} [data-testid="${LINK_MATERIAL_GRADE_SWITCH_TESTID}"]`;

const rowSelector = (label: string) =>
  `[data-testid="${PROCESS_ITEM_TESTID}"][data-process-label="${label}"]`;

export const clickProcessLinkMaterial = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${PROCESS_ITEM_LINK_MATERIAL_TESTID}"]`;
  await page.waitForSelector(sel);
  // See ProcessElectiveButton.click.puppeteer.ts — Tooltip wrapper makes
  // page.click's bubbling chain miss PointerContainer's onClick. Use a
  // programmatic HTMLElement.click() to open the panel reliably.
  await page.$eval(sel, (el) => (el as HTMLButtonElement).click());
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_FORM_TESTID}"]`,
  );
};

export const selectLinkMaterialOption = async (
  page: Page,
  materialLabel: string,
) => {
  const selectSel = `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_FORM_TESTID}"] [data-testid="${LINK_MATERIAL_SELECT_TESTID}"]`;
  await page.waitForSelector(selectSel);
  await page.click(selectSel);
  const optionSel = `[role="listbox"] [data-testid="link-material-option-${materialLabel}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

export const clickAddLinkMaterial = async (page: Page) => {
  const sel = `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_FORM_TESTID}"] [data-testid="${LINK_MATERIAL_ADD_TESTID}"]`;
  await page.waitForSelector(sel);
  // Programmatic click — see clickProcessLinkMaterial for rationale.
  await page.$eval(sel, (el) => (el as HTMLButtonElement).click());
};

export const expandGradeAccordion = async (page: Page) => {
  const summarySel = `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_GRADE_ACCORDION_SUMMARY_TESTID}"]`;
  await page.waitForSelector(summarySel);
  const expanded = await page.$eval(
    summarySel,
    (el) => el.getAttribute('aria-expanded') === 'true',
  );
  if (!expanded) await page.$eval(summarySel, (el) => (el as HTMLElement).click());
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_GRADE_ROW_TESTID}"]`,
  );
};

export const toggleGradeOverride = async (page: Page, gradLabel: string) => {
  const sel = `${gradRowFormControl(gradLabel)} input[type="checkbox"]`;
  await page.waitForSelector(sel);
  // MUI's Switch input has pointer-events: none — a click on the input is
  // intercepted by the visible track. Focus + Space dispatches a real
  // keyboard change event and reliably flips React state.
  await page.focus(sel);
  await page.keyboard.press('Space');
  await page.waitForSelector(`${sel}:checked`);
};


