/* istanbul ignore file */
/**
 * Seeds the active workspace's materials catalog by driving the
 * "Importar catálogo" PointerContainer through the bundled
 * `public/materials/materials.xlsx` fixture. Used by Composer e2e
 * tests that depend on at least one material type + a few materials
 * existing in the catalog.
 *
 * Goes through the same UI drivers production code does — click or
 * shortcut variant, gated by `variant`. The Materiais ribbon tab is
 * registered asynchronously by `Materials/kernelCalls.ts :: startModule`
 * (same race the collaborative typeShareAndCreate test guards against),
 * so we wait for the label before clicking it.
 */
import type { Page } from "puppeteer-core";
import { clickRibbonTab } from "@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer";
import { importFixtureCatalog } from "@system/modules/Materials/components/drivers/importCatalog.click.puppeteer";
import { importFixtureCatalogViaShortcut } from "@system/modules/Materials/components/drivers/importCatalog.shortcut.puppeteer";

const switchToMateriaisTab = async (page: Page) => {
  await page.waitForFunction(() => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
    );
    return tabs.some((t) => (t.textContent ?? "").trim() === "Materiais");
  });
  const clicked = await clickRibbonTab(page, undefined, "Materiais");
  if (!clicked) throw new Error("Materiais ribbon tab not found after wait");
  await page.waitForSelector('[data-testid="open-import-catalog"]');
};

export type SeedMaterialsCatalogVariant = "click" | "shortcut";

export const seedMaterialsCatalog = async (
  page: Page,
  variant: SeedMaterialsCatalogVariant = "click",
) => {
  await switchToMateriaisTab(page);
  if (variant === "shortcut") {
    await importFixtureCatalogViaShortcut(page);
  } else {
    await importFixtureCatalog(page);
  }
  await page.waitForSelector(
    '[data-testid="import-catalog-summary"][data-result="success"]',
  );
};
