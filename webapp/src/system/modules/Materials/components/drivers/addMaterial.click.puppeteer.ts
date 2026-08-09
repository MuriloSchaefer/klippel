/* istanbul ignore file */
/**
 * Click variant of the "Novo material" driver. Form-fill + confirm
 * live in `addMaterial.form.puppeteer.ts`; the shortcut variant
 * shares them.
 */
import type { Page } from "puppeteer-core";
import {
  ADD_MATERIAL_PANEL,
  ADD_MATERIAL_TRIGGER,
  type AddMaterialInput,
  confirmAddMaterial,
  fillAddMaterialForm,
} from "./addMaterial.form.puppeteer";

export type {
  AddMaterialInput,
  AttributeValue,
  ColorAttributeValue,
} from "./addMaterial.form.puppeteer";
export {
  fillAddMaterialForm,
  confirmAddMaterial,
} from "./addMaterial.form.puppeteer";

export const openAddMaterialPanel = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(ADD_MATERIAL_TRIGGER);
  await page.click(ADD_MATERIAL_TRIGGER);
  await page.waitForSelector(
    `[role="pointer-panel-content"] ${ADD_MATERIAL_PANEL}`,
  );
};

export const addMaterial = async (page: Page, input: AddMaterialInput) => {
  await openAddMaterialPanel(page);
  await fillAddMaterialForm(page, input);
  await confirmAddMaterial(page);
};
