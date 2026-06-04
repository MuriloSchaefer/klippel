import { z } from "zod";

import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { searchMaterialsViaClick } from "../components/drivers/searchMaterials.click.puppeteer";

/**
 * Click variant — focuses the MaterialStock search field by clicking it,
 * clears any prior query, and types `query`. An empty `query` clears the
 * field (back to the full catalog), since the click driver always
 * select-all + deletes before typing. Composes the search click driver;
 * no DOM walking lives here (mcp-tool-reuse.md).
 */
export const searchMaterialsTool = {
  name: "searchMaterials",
  description:
    "Filter the MaterialStock grid by typing {query} into the search field via the real UI (click to focus, clear, type). Pass an empty string to clear the search and show the full catalog.",
  inputSchema: {
    query: z
      .string()
      .describe("Text to search materials by; empty string clears the filter."),
  },
  async execute({ query }: { query: string }) {
    const page = await getPage();
    await page.bringToFront();
    await searchMaterialsViaClick(page, query);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true, query }) },
      ],
    };
  },
};
