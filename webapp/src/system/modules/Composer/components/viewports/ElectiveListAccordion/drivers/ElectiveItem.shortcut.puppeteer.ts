/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  EDIT_ELECTIVE_DEFAULT_TESTID,
  EDIT_ELECTIVE_FORM_TESTID,
  EDIT_ELECTIVE_NAME_TESTID,
  ELECTIVE_ITEM_TESTID,
} from './ElectiveItem.click.puppeteer';

export const FOCUS_ELECTIVE_LIST_SHORTCUT = {
  ctrl: true,
  alt: true,
  key: 'e',
} as const;
export const FOCUS_NEXT_ELECTIVE_SHORTCUT = 'ArrowDown' as const;
export const FOCUS_PREV_ELECTIVE_SHORTCUT = 'ArrowUp' as const;
export const EDIT_ELECTIVE_SHORTCUT = 'e' as const;
export const DELETE_ELECTIVE_SHORTCUT = 'd' as const;

const rowSelector = (label: string) =>
  `[data-testid="${ELECTIVE_ITEM_TESTID}"][data-elective-label="${label}"]`;

const focusEditFormField = async (page: Page, testid: string) => {
  await page.evaluate((id: string) => {
    const node = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      `[role="pointer-panel-content"] [data-testid="edit-elective-form"] [data-testid="${id}"] input, [role="pointer-panel-content"] [data-testid="edit-elective-form"] [data-testid="${id}"] textarea`,
    );
    node?.focus();
  }, testid);
};

export const focusElectiveItem = async (page: Page, label: string) => {
  const sel = rowSelector(label);
  await page.waitForSelector(sel);
  await page.focus(sel);
  await page.waitForSelector(`${sel}:focus`);
};

export const triggerFocusElectiveList = async (page: Page) => {
  await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (a?.matches('[data-testid="elective-item"]')) a.blur();
  });
  await page.keyboard.down('Control');
  await page.keyboard.down('Alt');
  await page.keyboard.press('e');
  await page.keyboard.up('Alt');
  await page.keyboard.up('Control');
  await page.waitForSelector(
    '[data-testid="elective-item"]:focus, #composer-add-elective:focus, [data-accordion-content="Eletivos da Peça"]:focus',
  );
};

export const triggerFocusNextElective = async (page: Page) => {
  await page.keyboard.press(FOCUS_NEXT_ELECTIVE_SHORTCUT);
};

export const triggerFocusPrevElective = async (page: Page) => {
  await page.keyboard.press(FOCUS_PREV_ELECTIVE_SHORTCUT);
};

export const triggerEditElectiveFromFocused = async (page: Page) => {
  await page.keyboard.press(EDIT_ELECTIVE_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${EDIT_ELECTIVE_FORM_TESTID}"]`,
  );
};

export const triggerDeleteElectiveFromFocused = async (page: Page) => {
  await page.keyboard.press(DELETE_ELECTIVE_SHORTCUT);
};

export const typeEditElectiveNameFromFocused = async (
  page: Page,
  name: string,
) => {
  await focusEditFormField(page, EDIT_ELECTIVE_NAME_TESTID);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(name);
};

export const setEditElectiveDefaultShortcut = async (
  page: Page,
  target: boolean,
) => {
  const sel = `[role="pointer-panel-content"] [data-testid="${EDIT_ELECTIVE_FORM_TESTID}"] [data-testid="${EDIT_ELECTIVE_DEFAULT_TESTID}"] input`;
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
  await page.waitForSelector(target ? `${sel}:checked` : `${sel}:not(:checked)`);
};

export const getFocusedElectiveLabel = async (
  page: Page,
): Promise<string | null> => {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a?.matches('[data-testid="elective-item"]')) return null;
    return a.getAttribute('data-elective-label');
  });
};

export type FocusedElectiveListTarget =
  | { type: 'elective-item'; label: string | null }
  | { type: 'add-elective-button' }
  | { type: 'unknown'; tag: string }
  | null;

export const getFocusedElectiveListTarget = async (
  page: Page,
): Promise<FocusedElectiveListTarget> => {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return null;
    if (a.matches('[data-testid="elective-item"]')) {
      return {
        type: 'elective-item' as const,
        label: a.getAttribute('data-elective-label'),
      };
    }
    if (a.id === 'composer-add-elective') {
      return { type: 'add-elective-button' as const };
    }
    return { type: 'unknown' as const, tag: a.tagName.toLowerCase() };
  });
};
