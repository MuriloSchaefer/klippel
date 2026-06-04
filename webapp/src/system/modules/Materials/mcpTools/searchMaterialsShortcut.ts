import { z } from "zod";

import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { searchMaterialsViaShortcut } from "../components/drivers/searchMaterials.shortcut.puppeteer";

/**
 * Shortcut variant — focuses the MaterialStock search field via the `/`
 * viewport binding (which focuses *and* selects the input), then types
 * `query`, replacing any prior text. Composes the search shortcut driver
 * only; it imports no `*.click.puppeteer.ts` driver so the keyboard path
 * stays genuinely independent (e2e-tests.md §5).
 *
 * Precondition: the stock viewport holds the keyboard context and focus
 * is not already in a text input, or the `/` is typed instead of routed.
 */
export const searchMaterialsShortcutTool = {
  name: "searchMaterialsShortcut",
  description:
    "Filter the MaterialStock grid by pressing '/' to focus the search field, then typing {query}. Keyboard-only; the viewport must be open and no input focused.",
  inputSchema: {
    query: z.string().describe("Text to search materials by."),
  },
  async execute({ query }: { query: string }) {
    const page = await getPage();
    await page.bringToFront();
    await searchMaterialsViaShortcut(page, query);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true, query }) },
      ],
    };
  },
};
