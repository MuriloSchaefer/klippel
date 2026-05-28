/* istanbul ignore file */
/**
 * Click variant of the "Importar catálogo" driver. Form-fill +
 * confirm live in `importCatalog.form.puppeteer.ts`; the shortcut
 * variant shares them.
 */
import type { Page } from "puppeteer-core";
import {
  IMPORT_CATALOG_PANEL,
  IMPORT_CATALOG_TRIGGER,
  confirmImport,
  pickFixture,
  waitForImportSummary,
} from "./importCatalog.form.puppeteer";

export {
  pickFixture,
  confirmImport,
  waitForImportSummary,
} from "./importCatalog.form.puppeteer";

export const openImportCatalogPanel = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(IMPORT_CATALOG_TRIGGER);
  await page.click(IMPORT_CATALOG_TRIGGER);
  await page.waitForSelector(
    `[role="pointer-panel-content"] ${IMPORT_CATALOG_PANEL}`,
  );
};

export const importFixtureCatalog = async (page: Page) => {
  await openImportCatalogPanel(page);
  await pickFixture(page);
  await confirmImport(page);
  await openImportCatalogPanel(page);
  await waitForImportSummary(page);
};
