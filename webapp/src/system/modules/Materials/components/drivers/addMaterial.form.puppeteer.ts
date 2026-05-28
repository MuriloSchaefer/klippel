/* istanbul ignore file */
/**
 * Trigger-agnostic form helpers for the "Novo material"
 * PointerContainer. Shared by `addMaterial.click.puppeteer.ts` and
 * `addMaterial.shortcut.puppeteer.ts`.
 */
import type { Page } from "puppeteer-core";
import { clickOptionByDataValue } from "@helpers/puppeteer/listbox";

export const ADD_MATERIAL_TRIGGER = '[data-testid="open-add-material"]';
export const ADD_MATERIAL_PANEL = '[data-testid="add-material-form"]';

const ID_INPUT = `${ADD_MATERIAL_PANEL} [data-testid="add-material-id"] input`;
const TYPE_COMBOBOX = `${ADD_MATERIAL_PANEL} [data-testid="add-material-type"] [role="combobox"]`;
const STOCK_AMOUNT = `${ADD_MATERIAL_PANEL} [data-testid="add-material-stock-amount"] input`;
const INDUSTRY_INPUT = `${ADD_MATERIAL_PANEL} [data-testid="add-material-industry"] input`;
const CONFIRM = '[data-testid="add-material-confirm"]';

const attributeInputSelector = (name: string) =>
  `${ADD_MATERIAL_PANEL} [data-testid="material-attr-${name}"] input`;

export interface AddMaterialInput {
  id: string;
  type: string;
  stockAmount?: number;
  industry?: string;
  attributes?: Record<string, string | number>;
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
  for (const [name, value] of Object.entries(input.attributes ?? {})) {
    await typeInto(page, attributeInputSelector(name), String(value));
  }
};

export const confirmAddMaterial = async (page: Page) => {
  await page.waitForSelector(`${CONFIRM}:not(:disabled)`);
  await page.click(CONFIRM);
  await page.waitForSelector(ADD_MATERIAL_PANEL, { hidden: true });
};
