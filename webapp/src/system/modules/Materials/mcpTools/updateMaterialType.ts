import { z } from "zod";

import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { updateMaterialType } from "../components/drivers/updateMaterialType.click.puppeteer";

/**
 * Click variant — registers a *new* version of an existing material
 * type (schema versions are immutable; "update" derives a successor).
 * Opens the "Editar tipo de material" PointerContainer via the ribbon
 * IconButton, picks {typeName}, edits the form, and confirms. Composes
 * the click driver only; no DOM walking lives here (mcp-tool-reuse.md).
 *
 * Precondition: the Materiais ribbon tab is active and {typeName}
 * already exists in the catalog so it is selectable.
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

export const updateMaterialTypeTool = {
  name: "updateMaterialType",
  description:
    "Register a new version of an existing material type through the real UI (click to open 'Editar tipo de material', pick the type, edit, confirm). Supply {typeName} and the fields to change: {version} (the new successor version), {principal}/{extra}, {stockUnit}, {consumptionUnit}, and the full {attributes} list (it replaces the current set).",
  inputSchema: {
    typeName: z
      .string()
      .describe("Name of the existing type to derive a new version from."),
    version: z
      .string()
      .optional()
      .describe("New successor version, e.g. '0.0.2'. Defaults to a patch bump."),
    principal: z.string().optional().describe("Principal selector attribute."),
    extra: z.string().optional().describe("Extra selector attribute."),
    stockUnit: z.string().optional().describe("Stock unit code."),
    consumptionUnit: z
      .string()
      .optional()
      .describe(
        "Target unit code for usage calculations; falls back to the stock unit when unset.",
      ),
    attributes: z
      .array(
        z.object({
          name: z.string(),
          kind: z.enum(ATTR_KINDS),
        }),
      )
      .optional()
      .describe("Full attribute set (name + kind); replaces the current attributes."),
  },
  async execute(input: {
    typeName: string;
    version?: string;
    principal?: string;
    extra?: string;
    stockUnit?: string;
    consumptionUnit?: string;
    attributes?: Array<{ name: string; kind: (typeof ATTR_KINDS)[number] }>;
  }) {
    const page = await getPage();
    await page.bringToFront();
    await updateMaterialType(page, input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, typeName: input.typeName }),
        },
      ],
    };
  },
};
