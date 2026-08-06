import { z } from "zod";

import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { updateMaterialTypeViaShortcut } from "../components/drivers/updateMaterialType.shortcut.puppeteer";

/**
 * Shortcut variant — opens the "Editar tipo de material"
 * PointerContainer by pressing `r` while the Materiais ribbon tab is
 * active (binding `Materials/TiposDeMateriais/updateType`, paired with
 * a visible `ShortcutHint`), then picks the type, edits, and confirms.
 * Composes the shortcut driver only; it imports no `*.click.puppeteer.ts`
 * driver so the keyboard path stays genuinely independent (e2e-tests.md
 * §5). Form-fill is shared with the click variant via the neutral
 * `*.form.puppeteer.ts`.
 *
 * Precondition: the Materiais ribbon tab holds the keyboard context, no
 * text input is focused, and {typeName} already exists in the catalog.
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

export const updateMaterialTypeShortcutTool = {
  name: "updateMaterialTypeShortcut",
  description:
    "Register a new version of an existing material type using the keyboard: press 'r' to open 'Editar tipo de material', pick the type, edit, and confirm. Same inputs as updateMaterialType. Requires the Materiais ribbon tab active and no input focused.",
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
    await updateMaterialTypeViaShortcut(page, input);
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
