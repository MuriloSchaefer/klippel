/* istanbul ignore file */
/**
 * Trigger-agnostic form helpers for the "Importar catálogo"
 * PointerContainer. Shared by `importCatalog.click.puppeteer.ts` and
 * `importCatalog.shortcut.puppeteer.ts`.
 */
import type { Page } from "puppeteer-core";

export const IMPORT_CATALOG_TRIGGER = '[data-testid="open-import-catalog"]';
export const IMPORT_CATALOG_PANEL = '[data-testid="import-catalog-form"]';
const USE_FIXTURE = '[data-testid="import-catalog-use-fixture"]';
const CONFIRM = '[data-testid="import-catalog-confirm"]';
const SUMMARY = '[data-testid="import-catalog-summary"]';

export const pickFixture = async (page: Page) => {
  await page.waitForSelector(`${IMPORT_CATALOG_PANEL} ${USE_FIXTURE}`);
  await page.click(`${IMPORT_CATALOG_PANEL} ${USE_FIXTURE}`);
};

export const confirmImport = async (page: Page) => {
  // Wait for the button to be enabled (form valid) before confirming. The
  // `:not(:disabled)` gate is the disabled-state check — we are not bypassing
  // validation, only the hit-test below.
  await page.waitForSelector(`${CONFIRM}:not(:disabled)`);
  // Programmatic click rather than `page.click`: the PointerContainer Modal is
  // `keepMounted`, and its actions column (drag / confirm / close, stacked with
  // `justify-content: space-evenly`) reflows as the panel's `width 1s` transition
  // and content height change. A coordinate hit-test can therefore land on the
  // adjacent `#close-panel` button, closing the panel without importing and
  // hanging the downstream summary wait. Targeting the element by selector
  // sidesteps coordinates entirely. See e2e-tests.md §5.
  await page.$eval(CONFIRM, (el) => (el as HTMLButtonElement).click());
  await page.waitForSelector(IMPORT_CATALOG_PANEL, { hidden: true });
};

/**
 * Re-open the panel and wait for the success summary to appear. The
 * importer runs in the main process; the renderer is notified via
 * `materials:import-finished` which surfaces the summary alert
 * inside the panel (and a summary). The panel auto-closes on
 * confirm, so callers that need to observe the summary must reopen.
 */
export const waitForImportSummary = async (page: Page) => {
  await page.waitForSelector(SUMMARY);
};
