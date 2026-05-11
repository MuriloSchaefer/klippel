/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const ADD_ELECTIVE_TRIGGER_TESTID = 'add-elective';
export const ADD_ELECTIVE_FORM_TESTID = 'add-elective-form';
export const ADD_ELECTIVE_NAME_TESTID = 'add-elective-name';
export const ADD_ELECTIVE_DEFAULT_TESTID = 'add-elective-default';
export const ADD_ELECTIVE_CONFIRM_TESTID = 'add-elective-confirm';

const formInputSelector = (testid: string) =>
  `[data-testid="${ADD_ELECTIVE_FORM_TESTID}"] [data-testid="${testid}"] input, [data-testid="${ADD_ELECTIVE_FORM_TESTID}"] [data-testid="${testid}"] textarea`;

export const openAddElectivePanel = async (page: Page) => {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForSelector(
    `[data-testid="${ADD_ELECTIVE_TRIGGER_TESTID}"]`,
  );
  await page.click(`[data-testid="${ADD_ELECTIVE_TRIGGER_TESTID}"]`);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ADD_ELECTIVE_FORM_TESTID}"]`,
  );
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
