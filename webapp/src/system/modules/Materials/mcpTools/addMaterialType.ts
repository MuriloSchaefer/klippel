import { z } from "zod";

import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { addMaterialType } from "../components/drivers/addMaterialType.click.puppeteer";

/**
 * Click variant — registers a new `MaterialType` schema version by
 * opening the "Novo tipo de material" PointerContainer via the ribbon
 * IconButton, filling the form, and confirming. Composes the click
 * driver only; no DOM walking lives here (mcp-tool-reuse.md).
 *
 * Precondition: the Materiais ribbon tab is active so the trigger is
 * mounted. The driver presses Escape first to drain any open panel.
 */
const ATTR_KINDS = [
  "string",
  "number",
  "color",
  "date",
  "unitValue",
  "compoundValue",
  "object",
] as const;

export const addMaterialTypeTool = {
  name: "addMaterialType",
  description:
    "Register a new material type schema version through the real UI (click to open 'Novo tipo de material', fill, confirm). Supply {name} and optionally {version} (default the form's 0.0.1), the {principal}/{extra} selector keys, a {stockUnit}, and the typed {attributes}.",
  inputSchema: {
    name: z.string().describe("Type name, e.g. 'malha'."),
    version: z
      .string()
      .optional()
      .describe("Schema version, e.g. '0.0.1'. Defaults to the form value."),
    principal: z
      .string()
      .optional()
      .describe("Principal selector attribute (defaults to 'nome')."),
    extra: z
      .string()
      .optional()
      .describe("Extra selector attribute (defaults to 'cor')."),
    stockUnit: z
      .string()
      .optional()
      .describe("Stock unit code; empty/omitted leaves it unset."),
    attributes: z
      .array(
        z.object({
          name: z.string(),
          kind: z.enum(ATTR_KINDS),
        }),
      )
      .optional()
      .describe("Declared attributes (name + kind) for materials of this type."),
  },
  async execute(input: {
    name: string;
    version?: string;
    principal?: string;
    extra?: string;
    stockUnit?: string;
    attributes?: Array<{ name: string; kind: (typeof ATTR_KINDS)[number] }>;
  }) {
    const page = await getPage();
    await page.bringToFront();
    await addMaterialType(page, input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, name: input.name }),
        },
      ],
    };
  },
};
