/* istanbul ignore file */
/**
 * Trigger-agnostic form helpers for the "Editar tipo de material"
 * PointerContainer. Shared by the click + shortcut drivers.
 */
import type { Page } from "puppeteer-core";
import { clickOptionByDataValue } from "@helpers/puppeteer/listbox";

export const UPDATE_MATERIAL_TYPE_TRIGGER =
  '[data-testid="open-update-material-type"]';
export const UPDATE_MATERIAL_TYPE_PANEL =
  '[data-testid="update-material-type-form"]';

const TYPE_SELECT = `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-select"] [role="combobox"]`;
const VERSION_INPUT = `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-version"] input`;
const PRINCIPAL_INPUT = `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-principal"] input`;
const EXTRA_INPUT = `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-extra"] input`;
const STOCK_UNIT_SELECTOR = `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-stock-unit"] [role="combobox"]`;
const CONSUMPTION_UNIT_SELECTOR = `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-consumption-unit"] [role="combobox"]`;
const ADD_ATTR_BTN = `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-attr-add"]`;
const ATTR_NAME = (i: number) =>
  `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-attr-name-${i}"] input`;
const ATTR_KIND_COMBOBOX = (i: number) =>
  `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-attr-kind-${i}"] [role="combobox"]`;
const ATTR_REMOVE = (i: number) =>
  `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-attr-remove-${i}"]`;
const CONFIRM = '[data-testid="update-material-type-confirm"]';

export interface AttrInput {
  name: string;
  kind:
    | "string"
    | "number"
    | "color"
    | "date"
    | "unitValue"
    | "compoundValue"
    | "object";
}

export interface UpdateMaterialTypeInput {
  typeName: string;
  version?: string;
  principal?: string;
  extra?: string;
  stockUnit?: string;
  consumptionUnit?: string;
  attributes?: AttrInput[];
}

const typeInto = async (page: Page, sel: string, value: string) => {
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Delete");
  if (value.length > 0) await page.type(sel, value);
};

const countAttrRows = async (page: Page): Promise<number> =>
  page.$$eval(
    `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid^="update-material-type-attr-name-"]`,
    (els) => els.length,
  );

export const fillUpdateMaterialTypeForm = async (
  page: Page,
  input: UpdateMaterialTypeInput,
) => {
  await page.click(TYPE_SELECT);
  await clickOptionByDataValue(page, input.typeName);
  await page.waitForSelector(VERSION_INPUT);

  if (input.version !== undefined) await typeInto(page, VERSION_INPUT, input.version);
  if (input.principal !== undefined)
    await typeInto(page, PRINCIPAL_INPUT, input.principal);
  if (input.extra !== undefined) await typeInto(page, EXTRA_INPUT, input.extra);
  if (input.stockUnit !== undefined) {
    await page.click(STOCK_UNIT_SELECTOR);
    await clickOptionByDataValue(page, input.stockUnit);
  }
  if (input.consumptionUnit !== undefined) {
    await page.click(CONSUMPTION_UNIT_SELECTOR);
    await clickOptionByDataValue(page, input.consumptionUnit);
  }

  if (input.attributes !== undefined) {
    let current = await countAttrRows(page);
    while (current > 0) {
      await page.click(ATTR_REMOVE(current - 1)).catch(() => {});
      const next = await countAttrRows(page);
      if (next === current) break;
      current = next;
    }
    for (let i = current; i < input.attributes.length; i += 1) {
      await page.click(ADD_ATTR_BTN);
    }
    for (let i = 0; i < input.attributes.length; i += 1) {
      await typeInto(page, ATTR_NAME(i), input.attributes[i].name);
      await page.click(ATTR_KIND_COMBOBOX(i));
      await clickOptionByDataValue(page, input.attributes[i].kind);
    }
  }
};

export const confirmUpdateMaterialType = async (page: Page) => {
  await page.waitForSelector(`${CONFIRM}:not(:disabled)`);
  await page.click(CONFIRM);
  await page.waitForSelector(UPDATE_MATERIAL_TYPE_PANEL, { hidden: true });
};
