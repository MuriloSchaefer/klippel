/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { logoItemSelector, LOGO_ITEM_TESTID } from './LogoItem.click.puppeteer';

export const FOCUS_LOGO_LIST_SHORTCUT = 'l' as const; // with Ctrl
export const FOCUS_NEXT_LOGO_SHORTCUT = 'ArrowDown' as const;
export const FOCUS_PREV_LOGO_SHORTCUT = 'ArrowUp' as const;
export const EDIT_LOGO_SHORTCUT = 'e' as const;
export const DELETE_LOGO_SHORTCUT = 'd' as const;
export const OPEN_PLACEMENTS_SHORTCUT = 'p' as const;
export const LINK_ELECTIVE_SHORTCUT = 'w' as const;
export const OPEN_AUDIT_SHORTCUT = 'l' as const;

/** Ctrl+l focuses the Logos list (registered in the ModelViewport context).
 * Focus lands on the first logo row, or the add button when the list is empty.
 * The binding focuses asynchronously (a setTimeout retry loop), so wait until
 * focus actually settles inside the list before issuing contextual keys — pressing
 * 'a' too early misses the (not-yet-active) LogoList shortcut context. */
export const triggerFocusLogoList = async (page: Page) => {
  await page.keyboard.down('Control');
  await page.keyboard.press(FOCUS_LOGO_LIST_SHORTCUT);
  await page.keyboard.up('Control');
  await page.waitForSelector(
    `[data-testid="${LOGO_ITEM_TESTID}"]:focus, [data-testid="add-logo"]:focus`,
  );
};

/** Focus a specific logo row so the row-scoped LogoList shortcut context
 * (FocusShortcutProvider) activates and its action keys (d/e/p/w/l) fire.
 *
 * Focuses the row directly rather than via Ctrl+l: that binding TOGGLES the
 * accordion closed when a row already holds focus, and closing a pointer opened
 * from the row restores focus into it — so Ctrl+l here would collapse the list.
 * The Ctrl+l binding itself is covered by the addLogo shortcut test. */
export const focusLogoRowByKeyboard = async (page: Page, label: string) => {
  const target = logoItemSelector(label);
  await page.waitForSelector(target);
  await page.focus(target);
  await page.waitForSelector(`${target}:focus`);
};

export const triggerEditFocusedLogo = async (page: Page) => {
  await page.keyboard.press(EDIT_LOGO_SHORTCUT);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-edit-form"]');
};

export const triggerDeleteFocusedLogo = (page: Page) =>
  page.keyboard.press(DELETE_LOGO_SHORTCUT);

export const triggerOpenPlacementsForFocusedLogo = async (page: Page) => {
  await page.keyboard.press(OPEN_PLACEMENTS_SHORTCUT);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-placements"]');
};

export const triggerLinkElectiveForFocusedLogo = async (page: Page) => {
  await page.keyboard.press(LINK_ELECTIVE_SHORTCUT);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-link-elective"]');
};
