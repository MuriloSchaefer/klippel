import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { importFixtureCatalogViaShortcut } from "../components/drivers/importCatalog.shortcut.puppeteer";

/**
 * Shortcut variant — imports the bundled `public/materials/materials.xlsx`
 * fixture by opening the "Importar catálogo" PointerContainer via the `a`
 * binding (`Materials/Estoque/importCatalog`, paired with a visible
 * `ShortcutHint`), then picking the fixture and confirming. Composes the
 * shortcut driver only; it imports no `*.click.puppeteer.ts` driver so the
 * keyboard path stays genuinely independent (e2e-tests.md §5).
 *
 * Precondition: the Materiais ribbon tab holds the keyboard context and no
 * text input is focused, or the `a` is typed instead of routed.
 */
export const importCatalogShortcutTool = {
  name: "importCatalogShortcut",
  description:
    "Import the bundled materials catalog fixture using the keyboard: press 'a' to open 'Importar catálogo', then pick the fixture and confirm. Idempotent. Requires the Materiais ribbon tab active and no input focused.",
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await importFixtureCatalogViaShortcut(page);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true }) },
      ],
    };
  },
};
