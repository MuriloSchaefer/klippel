/* istanbul ignore file */
/**
 * Trigger-agnostic form helpers for the "Novo tipo de material"
 * PointerContainer. The click and shortcut drivers both import these
 * — the only thing that differs between them is *how* the panel is
 * opened (button click vs `e` keypress). Per `webapp/src/docs/quality/e2e-tests.md`
 * the shortcut driver may not import the click driver directly.
 */
import type { Page } from "puppeteer-core";
import { clickOptionByDataValue } from "@helpers/puppeteer/listbox";

export const ADD_MATERIAL_TYPE_TRIGGER =
  '[data-testid="open-add-material-type"]';
export const ADD_MATERIAL_TYPE_PANEL =
  '[data-testid="add-material-type-form"]';

const NAME_INPUT = `${ADD_MATERIAL_TYPE_PANEL} [data-testid="add-material-type-name"] input`;
const VERSION_INPUT = `${ADD_MATERIAL_TYPE_PANEL} [data-testid="add-material-type-version"] input`;
const PRINCIPAL_INPUT = `${ADD_MATERIAL_TYPE_PANEL} [data-testid="add-material-type-principal"] input`;
const EXTRA_INPUT = `${ADD_MATERIAL_TYPE_PANEL} [data-testid="add-material-type-extra"] input`;
const STOCK_UNIT_SELECTOR = `${ADD_MATERIAL_TYPE_PANEL} [data-testid="add-material-type-stock-unit"] [role="combobox"]`;
const ADD_ATTR_BTN = `${ADD_MATERIAL_TYPE_PANEL} [data-testid="add-material-type-attr-add"]`;
const ATTR_NAME = (i: number) =>
  `${ADD_MATERIAL_TYPE_PANEL} [data-testid="add-material-type-attr-name-${i}"] input`;
const ATTR_KIND_COMBOBOX = (i: number) =>
  `${ADD_MATERIAL_TYPE_PANEL} [data-testid="add-material-type-attr-kind-${i}"] [role="combobox"]`;
const CONFIRM = '[data-testid="add-material-type-confirm"]';

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

export interface AddMaterialTypeInput {
  name: string;
  version?: string;
  principal?: string;
  extra?: string;
  stockUnit?: string;
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

export const fillAddMaterialTypeForm = async (
  page: Page,
  input: AddMaterialTypeInput,
) => {
  await typeInto(page, NAME_INPUT, input.name);
  if (input.version !== undefined) await typeInto(page, VERSION_INPUT, input.version);
  if (input.principal !== undefined)
    await typeInto(page, PRINCIPAL_INPUT, input.principal);
  if (input.extra !== undefined) await typeInto(page, EXTRA_INPUT, input.extra);
  if (input.stockUnit !== undefined) {
    await page.click(STOCK_UNIT_SELECTOR);
    await clickOptionByDataValue(page, input.stockUnit);
  }
  if (input.attributes !== undefined) {
    const desired = input.attributes;
    for (let i = 1; i < desired.length; i += 1) {
      const present = await page
        .waitForSelector(ATTR_NAME(i), { timeout: 200 })
        .then(() => true)
        .catch(() => false);
      if (!present) await page.click(ADD_ATTR_BTN);
    }
    for (let i = 0; i < desired.length; i += 1) {
      await typeInto(page, ATTR_NAME(i), desired[i].name);
      await page.click(ATTR_KIND_COMBOBOX(i));
      await clickOptionByDataValue(page, desired[i].kind);
    }
  }
};

export const confirmAddMaterialType = async (page: Page) => {
  await page.waitForSelector(`${CONFIRM}:not(:disabled)`);
  await page.click(CONFIRM);
  await page.waitForSelector(ADD_MATERIAL_TYPE_PANEL, { hidden: true });
};
