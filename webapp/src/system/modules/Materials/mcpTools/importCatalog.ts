import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { importFixtureCatalog } from "../components/drivers/importCatalog.click.puppeteer";

/**
 * Click variant — imports the bundled `public/materials/materials.xlsx`
 * fixture through the "Importar catálogo" PointerContainer (open via the
 * ribbon IconButton, pick the fixture, confirm, wait for the summary).
 * Composes the click driver only; no DOM walking lives here
 * (mcp-tool-reuse.md). The import is idempotent — re-running against a
 * catalog that already holds the fixture adds no new rows.
 *
 * Precondition: the Materiais ribbon tab is active so the trigger is
 * mounted.
 */
export const importCatalogTool = {
  name: "importCatalog",
  description:
    "Import the bundled materials catalog fixture through the real UI (click 'Importar catálogo', pick the fixture, confirm). Idempotent — re-importing adds no duplicate rows. Requires the Materiais ribbon tab active.",
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await importFixtureCatalog(page);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true }) },
      ],
    };
  },
};
