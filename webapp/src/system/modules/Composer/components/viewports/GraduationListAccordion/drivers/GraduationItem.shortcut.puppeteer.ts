/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  EDIT_GRADUATION_FORM_TESTID,
  GRADUATION_ITEM_TESTID,
} from './GraduationItem.click.puppeteer';

export const FOCUS_GRADUATION_LIST_SHORTCUT = { ctrl: true, alt: true, key: 'g' } as const;
export const FOCUS_NEXT_GRADUATION_SHORTCUT = 'ArrowDown' as const;
export const FOCUS_PREV_GRADUATION_SHORTCUT = 'ArrowUp' as const;
export const EDIT_GRADUATION_SHORTCUT = 'r' as const;
export const DELETE_GRADUATION_SHORTCUT = 'd' as const;
export const MOVE_UP_GRADUATION_SHORTCUT = 'w' as const;
export const MOVE_DOWN_GRADUATION_SHORTCUT = 's' as const;

const rowSelector = (label: string) =>
  `[data-testid="${GRADUATION_ITEM_TESTID}"][data-graduation-label="${label}"]`;

export const focusGraduationItem = async (page: Page, label: string) => {
  const sel = rowSelector(label);
  await page.waitForSelector(sel);
  await page.focus(sel);
  await page.waitForFunction(
    (s: string) => document.activeElement?.matches(s) ?? false,
    {},
    sel,
  );
};

export const triggerFocusGraduationList = async (page: Page) => {
  await page.keyboard.down('Control');
  await page.keyboard.down('Alt');
  await page.keyboard.press('g');
  await page.keyboard.up('Alt');
  await page.keyboard.up('Control');
  await page.waitForFunction(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return false;
    if (active.matches('[data-testid="graduation-item"]')) return true;
    if (active.id === 'composer-add-graduation') return true;
    // Empty list fallback focuses the accordion content panel.
    return active.matches('[data-accordion-content="Graduações da Peça"]');
  }, { timeout: 3_000 });
};

export const triggerFocusNextGraduation = async (page: Page) => {
  await page.keyboard.press(FOCUS_NEXT_GRADUATION_SHORTCUT);
};

export const triggerFocusPrevGraduation = async (page: Page) => {
  await page.keyboard.press(FOCUS_PREV_GRADUATION_SHORTCUT);
};

export const triggerEditGraduationFromFocused = async (page: Page) => {
  await page.keyboard.press(EDIT_GRADUATION_SHORTCUT);
  await page.waitForSelector(`[data-testid="${EDIT_GRADUATION_FORM_TESTID}"]`);
};

export const triggerDeleteGraduationFromFocused = async (page: Page) => {
  await page.keyboard.press(DELETE_GRADUATION_SHORTCUT);
};

export const triggerMoveUpGraduationFromFocused = async (page: Page) => {
  await page.keyboard.press(MOVE_UP_GRADUATION_SHORTCUT);
};

export const triggerMoveDownGraduationFromFocused = async (page: Page) => {
  await page.keyboard.press(MOVE_DOWN_GRADUATION_SHORTCUT);
};

export const getFocusedGraduationLabel = async (page: Page): Promise<string | null> => {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a?.matches('[data-testid="graduation-item"]')) return null;
    return a.getAttribute('data-graduation-label');
  });
};

export type FocusedGraduationListTarget =
  | { type: 'graduation-item'; label: string | null }
  | { type: 'add-graduation-button' }
  | { type: 'unknown'; tag: string }
  | null;

export const getFocusedGraduationListTarget = async (
  page: Page,
): Promise<FocusedGraduationListTarget> => {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return null;
    if (a.matches('[data-testid="graduation-item"]')) {
      return { type: 'graduation-item' as const, label: a.getAttribute('data-graduation-label') };
    }
    if (a.id === 'composer-add-graduation') {
      return { type: 'add-graduation-button' as const };
    }
    return { type: 'unknown' as const, tag: a.tagName.toLowerCase() };
  });
};

/**
 * Edit shortcut path for label/amount fields. Tab traversal:
 *   focused row → 'r' opens form → label field is autoFocused → Tab → amount → Save (Enter on either field).
 * The form commits on Enter from any field; we use that to avoid manually pressing the save button.
 */
export const typeEditLabelFromFocused = async (page: Page, label: string) => {
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(label);
};

export const typeEditAmountFromFocused = async (page: Page, amount: number) => {
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(String(amount));
};

export const commitEditGraduationFromFocused = async (page: Page) => {
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="edit-graduation-form"]'),
    { timeout: 5_000 },
  );
};
