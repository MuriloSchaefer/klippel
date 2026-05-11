/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  ADD_ELECTIVE_DEFAULT_TESTID,
  ADD_ELECTIVE_FORM_TESTID,
  ADD_ELECTIVE_NAME_TESTID,
} from './AddElectiveButton.click.puppeteer';

export const ADD_ELECTIVE_SHORTCUT = 'a' as const;

const focusFormField = async (page: Page, testid: string) => {
  await page.evaluate((id: string) => {
    const node = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      `[role="pointer-panel-content"] [data-testid="${id}"] input, [role="pointer-panel-content"] [data-testid="${id}"] textarea`,
    );
    node?.focus();
  }, testid);
};

export const triggerAddElective = async (page: Page) => {
  // 'a' is contextual: only fires when focus is inside the Eletivos accordion.
  await page.keyboard.press(ADD_ELECTIVE_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ADD_ELECTIVE_FORM_TESTID}"]`,
  );
};

export const typeAddElectiveNameFromFocused = async (
  page: Page,
  name: string,
) => {
  await focusFormField(page, ADD_ELECTIVE_NAME_TESTID);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(name);
};

export const setAddElectiveDefaultShortcut = async (
  page: Page,
  target: boolean,
) => {
  const sel = `[role="pointer-panel-content"] [data-testid="${ADD_ELECTIVE_DEFAULT_TESTID}"] input`;
  await page.waitForSelector(sel);
  const checked = await page.$eval(
    sel,
    (el) => (el as HTMLInputElement).checked,
  );
  if (checked === target) return;
  await page.evaluate((s: string) => {
    const el = document.querySelector<HTMLInputElement>(s);
    el?.focus();
  }, sel);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    (args: { s: string; t: boolean }) => {
      const el = document.querySelector<HTMLInputElement>(args.s);
      return !!el && el.checked === args.t;
    },
    { timeout: 2_000 },
    { s: sel, t: target },
  );
};
