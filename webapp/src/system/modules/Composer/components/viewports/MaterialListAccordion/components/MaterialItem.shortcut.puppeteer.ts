import type { Page } from 'puppeteer-core';
import { MATERIAL_ITEM_TESTID } from './MaterialItem.click.puppeteer';

export const EDIT_MATERIAL_SHORTCUT = 'e' as const;
export const DELETE_MATERIAL_SHORTCUT = 'M' as const;

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

/** Trigger the edit shortcut. Assumes a material row is focused. Leaves focus inside the inline edit form. */
export const triggerEditMaterialFromFocused = async (page: Page) => {
  await page.keyboard.press(EDIT_MATERIAL_SHORTCUT);
  await page.waitForSelector('[data-testid="edit-material-form"]');
};

/** Trigger the delete shortcut. Assumes a material row is focused. */
export const triggerDeleteMaterialFromFocused = async (page: Page) => {
  await page.keyboard.down('Shift');
  await page.keyboard.press('m');
  await page.keyboard.up('Shift');
};
