import type { Page } from 'puppeteer-core';
import { MATERIAL_ITEM_TESTID } from './MaterialItem.click.puppeteer';

export const FOCUS_MATERIAL_LIST_SHORTCUT = { ctrl: true, key: 'm' } as const;
export const FOCUS_NEXT_SHORTCUT = 'ArrowDown' as const;
export const FOCUS_PREV_SHORTCUT = 'ArrowUp' as const;
export const EDIT_MATERIAL_SHORTCUT = 'e' as const;
export const DELETE_MATERIAL_SHORTCUT = 'd' as const;
export const ADD_MATERIAL_FROM_LIST_SHORTCUT = 'a' as const;

const rowSelector = (label: string) =>
  `[data-testid="${MATERIAL_ITEM_TESTID}"][data-material-label="${label}"]`;

/**
 * Programmatically focus the material row matching `label`. Equivalent to a
 * user Tab-ing onto the row — the row is `tabIndex=0` so this is a real focus
 * event, not a click.
 */
export const focusMaterialItem = async (page: Page, label: string) => {
  const sel = rowSelector(label);
  await page.waitForSelector(sel);
  await page.focus(sel);
  await page.waitForFunction(
    (s: string) => document.activeElement?.matches(s) ?? false,
    {},
    sel,
  );
};

/**
 * Press Ctrl+M from the model viewport. Opens the Materiais accordion (if
 * collapsed) and focuses the first material row, or the add-material button
 * when the list is empty.
 */
export const triggerFocusMaterialList = async (page: Page) => {
  await page.keyboard.down('Control');
  await page.keyboard.press('m');
  await page.keyboard.up('Control');
  await page.waitForFunction(() => {
    const active = document.activeElement;
    if (!active) return false;
    if (active.matches('[data-testid="material-item"]')) return true;
    return active.id === 'composer-add-material';
  }, { timeout: 3_000 });
};

/** Press ArrowDown to move focus to the next material row. */
export const triggerFocusNextMaterial = async (page: Page) => {
  await page.keyboard.press(FOCUS_NEXT_SHORTCUT);
};

/** Press ArrowUp to move focus to the previous material row. */
export const triggerFocusPrevMaterial = async (page: Page) => {
  await page.keyboard.press(FOCUS_PREV_SHORTCUT);
};

/** Trigger the edit shortcut. Assumes a material row is focused. Leaves focus inside the inline edit form. */
export const triggerEditMaterialFromFocused = async (page: Page) => {
  await page.keyboard.press(EDIT_MATERIAL_SHORTCUT);
  await page.waitForSelector('[data-testid="edit-material-form"]');
};

/** Trigger the delete shortcut. Assumes a material row is focused. */
export const triggerDeleteMaterialFromFocused = async (page: Page) => {
  await page.keyboard.press(DELETE_MATERIAL_SHORTCUT);
};
