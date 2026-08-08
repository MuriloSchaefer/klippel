/* istanbul ignore file */
/**
 * Save the whole session through the UI.
 *
 * Session data is a point-in-time snapshot: nothing writes to `.session/`
 * except an explicit save (e2e-tests.md §12). A test that needs state on disk
 * must therefore *save it the way a user does* — clicking here — rather than
 * assuming a mutation persisted itself.
 */
import type { Page } from 'puppeteer-core';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';

export const SESSION_AUTOSAVER_TESTID = 'session-autosaver';
export const SESSION_AUTOSAVER_PANEL_TESTID = 'session-autosaver-panel';
export const SAVE_SESSION_NOW_TESTID = 'save-session-now';

const PANEL = `[data-testid="${SESSION_AUTOSAVER_PANEL_TESTID}"]`;

const TRIGGER = `[data-testid="${SESSION_AUTOSAVER_TESTID}"]`;

/**
 * Open the session-saver popover in the system tray.
 *
 * Programmatic click: a save usually follows some other flow, and a
 * still-mounted `PointerContainer` Modal portal (`keepMounted`) intercepts the
 * hit-test on the tray icon (e2e-tests.md §5). `resetUIState` first drains
 * whatever that flow left open.
 */
export const openSessionSaverPanel = async (page: Page) => {
  await resetUIState(page);
  await page.waitForSelector(TRIGGER);
  await page.$eval(TRIGGER, (el) => (el as HTMLElement).click());
  await page.waitForSelector(PANEL);
};

/**
 * Click "Salvar agora" and wait for the snapshot to be on disk.
 *
 * The wait is on `data-session-saved-at`, which the button sets only after
 * `storage.saveSession()` resolves — every registered writer has finished. A
 * test that reloads before that would race the write.
 */
export const saveSessionViaUI = async (page: Page) => {
  await openSessionSaverPanel(page);
  await page.click(`[data-testid="${SAVE_SESSION_NOW_TESTID}"]`);
  await page.waitForSelector(`${PANEL}[data-session-saved-at]`);
  await page.waitForSelector(`${PANEL}[data-session-saving="false"]`);
  // Close the popover so it does not swallow the next interaction's hit-test.
  // Toggling the trigger is deterministic; Escape depends on the popover's
  // keyboard handling winning over whatever else is focused.
  await page.$eval(TRIGGER, (el) => (el as HTMLElement).click());
  await page.waitForSelector(PANEL, { hidden: true });
};
