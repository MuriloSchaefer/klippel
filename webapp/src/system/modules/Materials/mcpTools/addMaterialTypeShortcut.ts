import { z } from "zod";

import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { addMaterialTypeViaShortcut } from "../components/drivers/addMaterialType.shortcut.puppeteer";

/**
 * Shortcut variant — opens the "Novo tipo de material" PointerContainer
 * by pressing `e` while the Materiais ribbon tab is active (binding
 * `Materials/TiposDeMateriais/addType`, paired with a visible
 * `ShortcutHint`), then fills + confirms. Composes the shortcut driver
 * only; it imports no `*.click.puppeteer.ts` driver so the keyboard
 * path stays genuinely independent (e2e-tests.md §5). Form-fill is
 * shared with the click variant via the neutral `*.form.puppeteer.ts`.
 *
 * Precondition: the Materiais ribbon tab holds the keyboard context and
 * no text input is focused, or the `e` is typed instead of routed.
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

export const addMaterialTypeShortcutTool = {
  name: "addMaterialTypeShortcut",
  description:
    "Register a new material type schema version using the keyboard: press 'e' to open 'Novo tipo de material', then fill and confirm. Same inputs as addMaterialType. Requires the Materiais ribbon tab active and no input focused.",
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
    await addMaterialTypeViaShortcut(page, input);
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
