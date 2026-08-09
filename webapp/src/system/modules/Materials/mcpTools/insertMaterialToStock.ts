import { z } from "zod";

import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { addMaterial } from "../components/drivers/addMaterial.click.puppeteer";
import type { AddMaterialInput } from "../components/drivers/addMaterial.click.puppeteer";

/**
 * Click variant — inserts a material into the **stock catalog** by opening
 * the "Novo material" PointerContainer from the Materiais ribbon, filling
 * the identity block plus the schema-driven attribute block, and
 * confirming. Composes the click driver only; no DOM walking lives here
 * (mcp-tool-reuse.md).
 *
 * Not to be confused with the Composer's `addMaterial`, which creates a
 * material *node inside a model* referencing a catalog entry. This one
 * creates the catalog entry itself.
 *
 * Precondition: the Materiais ribbon tab is active so `open-add-material`
 * is mounted, and `type` is already a registered material type — the
 * attribute block is rendered from that type's latest schema, so an
 * unknown type yields no attribute inputs.
 */
const unitValueSchema = z.object({
  amount: z.number(),
  unit: z.string(),
});

// Order is load-bearing: `z.union` takes the FIRST member that parses, and
// zod strips unknown keys. The color variant has only optional properties,
// so it matches *any* object and would swallow a unitValue/compoundValue,
// handing the driver an empty `{}`. The two variants with `required` keys
// therefore have to be tried first, most-specific downwards — mirroring the
// same ordering the driver's `setAttribute` needs.
const attributeValueSchema = z.union([
  z.string(),
  z.number(),
  // compoundValue — quotient / dividend, e.g. 185 g per 1 m².
  z.object({ quotient: unitValueSchema, dividend: unitValueSchema }),
  // unitValue — amount + unit id (e.g. { amount: 120, unit: "centimetros7" }).
  unitValueSchema,
  // color — SchemaDrivenFields edits hex + rótulo separately. Last, because
  // both keys are optional and it would otherwise match everything.
  z.object({ hex: z.string().optional(), label: z.string().optional() }),
]);

export const insertMaterialToStockTool = {
  name: "insertMaterialToStock",
  description:
    "Insert a material into the stock catalog through the real UI (click 'Novo material', fill, confirm). Requires the Materiais ribbon tab active and an already-registered {type}. Attribute values are typed by the type's schema: plain string/number, {hex,label} for color, {amount,unit} for unitValue, {quotient,dividend} for compoundValue. Give every colour/size variant of one supplier product the SAME {externalId} so the Composer groups them as one product with N variants.",
  inputSchema: {
    id: z
      .string()
      .describe("Unique slug for the catalog row, e.g. 'piquet-pv-marinho'."),
    type: z
      .string()
      .describe("Registered material type name, e.g. 'malha'."),
    stockAmount: z
      .number()
      .optional()
      .describe("Initial stock quantity; the unit comes from the type schema."),
    industry: z
      .string()
      .optional()
      .describe("Industry / supplier name, e.g. 'Sajama'."),
    externalId: z
      .string()
      .optional()
      .describe(
        "Supplier product code. Shared across every variant of the same product so they group into one selectable item.",
      ),
    externalURL: z
      .string()
      .optional()
      .describe("Supplier product page URL."),
    imageURL: z
      .string()
      .optional()
      .describe(
        "URL of the product photo / colour swatch. Stored as a reference — nothing is downloaded or uploaded.",
      ),
    attributes: z
      .record(z.string(), attributeValueSchema)
      .optional()
      .describe(
        "Attribute values keyed by the names the type schema declares.",
      ),
  },
  async execute(input: AddMaterialInput) {
    const page = await getPage();
    await page.bringToFront();
    await addMaterial(page, input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            id: input.id,
            type: input.type,
            externalId: input.externalId,
            externalURL: input.externalURL,
            imageURL: input.imageURL,
          }),
        },
      ],
    };
  },
};
