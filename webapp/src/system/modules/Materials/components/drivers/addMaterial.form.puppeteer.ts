/* istanbul ignore file */
/**
 * Trigger-agnostic form helpers for the "Novo material"
 * PointerContainer. Shared by `addMaterial.click.puppeteer.ts` and
 * `addMaterial.shortcut.puppeteer.ts`.
 */
import type { Page } from "puppeteer-core";
import { clickOptionByDataValue } from "@helpers/puppeteer/listbox";
import {
  setCompoundValue,
  type CompoundValue,
  type UnitValue,
} from "@helpers/puppeteer/compoundSelector";

export const ADD_MATERIAL_TRIGGER = '[data-testid="open-add-material"]';
export const ADD_MATERIAL_PANEL = '[data-testid="add-material-form"]';

const ID_INPUT = `${ADD_MATERIAL_PANEL} [data-testid="add-material-id"] input`;
const TYPE_COMBOBOX = `${ADD_MATERIAL_PANEL} [data-testid="add-material-type"] [role="combobox"]`;
const STOCK_AMOUNT = `${ADD_MATERIAL_PANEL} [data-testid="add-material-stock-amount"] input`;
const INDUSTRY_INPUT = `${ADD_MATERIAL_PANEL} [data-testid="add-material-industry"] input`;
const EXTERNAL_ID_INPUT = `${ADD_MATERIAL_PANEL} [data-testid="add-material-external-id"] input`;
const EXTERNAL_URL_INPUT = `${ADD_MATERIAL_PANEL} [data-testid="add-material-external-url"] input`;
const IMAGE_URL_INPUT = `${ADD_MATERIAL_PANEL} [data-testid="add-material-image-url"] input`;
const CONFIRM = '[data-testid="add-material-confirm"]';

const attributeScope = (name: string) =>
  `${ADD_MATERIAL_PANEL} [data-testid="material-attr-${name}"]`;
const attributeInputSelector = (name: string) => `${attributeScope(name)} input`;
const attributePartSelector = (name: string, part: string) =>
  `${ADD_MATERIAL_PANEL} [data-testid="material-attr-${name}-${part}"]`;

/** Color attributes are edited as a hex + rótulo pair (SchemaDrivenFields). */
export type ColorAttributeValue = { hex?: string; label?: string };

/**
 * One value per attribute kind declared by the type schema. The shape is
 * what discriminates — `SchemaDrivenFields` renders a different control per
 * kind, so the driver has to reach for a different selector per kind too:
 *
 *   string | number  → single text input
 *   color            → `-hex` + `-label` inputs
 *   unitValue        → `-amount` input + `-unit` UnitSelector
 *   compoundValue    → the nested `[role="compound-selector"]`
 */
export type AttributeValue =
  | string
  | number
  | ColorAttributeValue
  | UnitValue
  | CompoundValue;

export interface AddMaterialInput {
  id: string;
  type: string;
  stockAmount?: number;
  industry?: string;
  /**
   * Supplier-side product code. Materials sharing it are grouped by the
   * Composer's material selector into one product with N variants, so every
   * colour of the same fabric must carry the *same* value here.
   */
  externalId?: string;
  /** Supplier product page. */
  externalURL?: string;
  /** Supplier product photo / colour swatch. Stored as a reference, not uploaded. */
  imageURL?: string;
  attributes?: Record<string, AttributeValue>;
}

const isCompound = (v: AttributeValue): v is CompoundValue =>
  typeof v === "object" &&
  v !== null &&
  "quotient" in v &&
  "dividend" in v;

const isUnitValue = (v: AttributeValue): v is UnitValue =>
  typeof v === "object" && v !== null && "amount" in v && "unit" in v;

const isColor = (v: AttributeValue): v is ColorAttributeValue =>
  typeof v === "object" && v !== null && ("hex" in v || "label" in v);

const typeInto = async (page: Page, sel: string, value: string) => {
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Delete");
  if (value.length > 0) await page.type(sel, value);
};

const setUnitValueAttribute = async (
  page: Page,
  name: string,
  value: UnitValue,
) => {
  await typeInto(
    page,
    `${attributePartSelector(name, "amount")} input`,
    String(value.amount),
  );
  const combobox = `${attributePartSelector(name, "unit")} [role="combobox"]`;
  await page.waitForSelector(combobox);
  await page.click(combobox);
  await clickOptionByDataValue(page, value.unit);
};

const setColorAttribute = async (
  page: Page,
  name: string,
  value: ColorAttributeValue,
) => {
  if (value.hex !== undefined)
    await typeInto(page, `${attributePartSelector(name, "hex")} input`, value.hex);
  if (value.label !== undefined)
    await typeInto(
      page,
      `${attributePartSelector(name, "label")} input`,
      value.label,
    );
};

const setAttribute = async (
  page: Page,
  name: string,
  value: AttributeValue,
) => {
  if (typeof value === "string" || typeof value === "number") {
    await typeInto(page, attributeInputSelector(name), String(value));
    return;
  }
  // Order matters: a CompoundValue also has object halves, so it has to be
  // matched before the narrower UnitValue / color shapes.
  if (isCompound(value)) {
    await setCompoundValue(page, attributeScope(name), value);
    return;
  }
  if (isUnitValue(value)) {
    await setUnitValueAttribute(page, name, value);
    return;
  }
  if (isColor(value)) {
    await setColorAttribute(page, name, value);
    return;
  }
  throw new Error(
    `Unsupported attribute value for "${name}": ${JSON.stringify(value)}`,
  );
};

export const fillAddMaterialForm = async (
  page: Page,
  input: AddMaterialInput,
) => {
  await typeInto(page, ID_INPUT, input.id);
  await page.click(TYPE_COMBOBOX);
  await clickOptionByDataValue(page, input.type);
  if (input.stockAmount !== undefined)
    await typeInto(page, STOCK_AMOUNT, String(input.stockAmount));
  if (input.industry !== undefined)
    await typeInto(page, INDUSTRY_INPUT, input.industry);
  if (input.externalId !== undefined)
    await typeInto(page, EXTERNAL_ID_INPUT, input.externalId);
  if (input.externalURL !== undefined)
    await typeInto(page, EXTERNAL_URL_INPUT, input.externalURL);
  if (input.imageURL !== undefined)
    await typeInto(page, IMAGE_URL_INPUT, input.imageURL);
  for (const [name, value] of Object.entries(input.attributes ?? {})) {
    await setAttribute(page, name, value);
  }
};

export const confirmAddMaterial = async (page: Page) => {
  await page.waitForSelector(`${CONFIRM}:not(:disabled)`);
  await page.click(CONFIRM);
  await page.waitForSelector(ADD_MATERIAL_PANEL, { hidden: true });
};
