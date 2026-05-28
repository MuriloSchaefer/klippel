/* istanbul ignore file */
/**
 * Shortcut variant of the "Importar catálogo" driver. Opens the
 * PointerContainer via `i` while the Materiais ribbon tab is active
 * — binding registered in `Materials/kernelCalls.ts`
 * (`Materials/Estoque/importCatalog`).
 */
import type { Page } from "puppeteer-core";
import {
  IMPORT_CATALOG_PANEL,
  confirmImport,
  pickFixture,
  waitForImportSummary,
} from "./importCatalog.form.puppeteer";

export {
  pickFixture,
  confirmImport,
  waitForImportSummary,
} from "./importCatalog.form.puppeteer";

export const openImportCatalogPanelShortcut = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.keyboard.press("a");
  await page.waitForSelector(
    `[role="pointer-panel-content"] ${IMPORT_CATALOG_PANEL}`,
  );
};

export const importFixtureCatalogViaShortcut = async (page: Page) => {
  await openImportCatalogPanelShortcut(page);
  await pickFixture(page);
  await confirmImport(page);
  await waitForImportSummary(page);
};
