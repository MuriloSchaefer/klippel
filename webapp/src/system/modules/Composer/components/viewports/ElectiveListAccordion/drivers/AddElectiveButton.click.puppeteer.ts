/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';

export const ADD_ELECTIVE_TRIGGER_TESTID = 'add-elective';
export const ADD_ELECTIVE_FORM_TESTID = 'add-elective-form';
export const ADD_ELECTIVE_NAME_TESTID = 'add-elective-name';
export const ADD_ELECTIVE_DEFAULT_TESTID = 'add-elective-default';
export const ADD_ELECTIVE_CONFIRM_TESTID = 'add-elective-confirm';

const formInputSelector = (testid: string) =>
  `[data-testid="${ADD_ELECTIVE_FORM_TESTID}"] [data-testid="${testid}"] input, [data-testid="${ADD_ELECTIVE_FORM_TESTID}"] [data-testid="${testid}"] textarea`;

/** Open the "Adicionar Eletivo" pointer panel. A programmatic click bypasses the
 * layout hit-test, so a still-mounted Modal portal from a closed `PointerContainer`
 * (`keepMounted`) can't swallow it (e2e-tests.md §4); `resetUIState` first clears
 * any panel left open by a prior step. */
export const openAddElectivePanel = async (page: Page) => {
  const trigger = `[data-testid="${ADD_ELECTIVE_TRIGGER_TESTID}"]`;
  const formSel = `[role="pointer-panel-content"] [data-testid="${ADD_ELECTIVE_FORM_TESTID}"]`;

  await resetUIState(page);
  await page.waitForSelector(trigger);
  await page.$eval(trigger, (el) => (el as HTMLElement).click());
  await page.waitForSelector(formSel);
};

export const typeAddElectiveName = async (page: Page, name: string) => {
  const sel = formInputSelector(ADD_ELECTIVE_NAME_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(sel, name);
};

export const setAddElectiveDefault = async (page: Page, target: boolean) => {
  const sel = `[data-testid="${ADD_ELECTIVE_FORM_TESTID}"] [data-testid="${ADD_ELECTIVE_DEFAULT_TESTID}"] input`;
  await page.waitForSelector(sel);
  const checked = await page.$eval(
    sel,
    (el) => (el as HTMLInputElement).checked,
  );
  if (checked !== target) {
    await page.click(sel);
  }
};
