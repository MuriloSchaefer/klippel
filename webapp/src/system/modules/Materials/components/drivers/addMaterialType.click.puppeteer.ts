/* istanbul ignore file */
/**
 * Click variant of the "Novo tipo de material" driver. Opens the
 * PointerContainer by clicking the ribbon `IconButton`; form-fill and
 * confirm live in `addMaterialType.form.puppeteer.ts` so the shortcut
 * variant can share them without violating the
 * `*.shortcut.puppeteer.ts → no click driver imports` rule.
 */
import type { Page } from "puppeteer-core";
import {
  ADD_MATERIAL_TYPE_PANEL,
  ADD_MATERIAL_TYPE_TRIGGER,
  type AddMaterialTypeInput,
  confirmAddMaterialType,
  fillAddMaterialTypeForm,
} from "./addMaterialType.form.puppeteer";

export type { AddMaterialTypeInput, AttrInput } from "./addMaterialType.form.puppeteer";
export {
  fillAddMaterialTypeForm,
  confirmAddMaterialType,
} from "./addMaterialType.form.puppeteer";

export const openAddMaterialTypePanel = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(ADD_MATERIAL_TYPE_TRIGGER);
  await page.click(ADD_MATERIAL_TYPE_TRIGGER);
  await page.waitForSelector(
    `[role="pointer-panel-content"] ${ADD_MATERIAL_TYPE_PANEL}`,
  );
};

export const addMaterialType = async (
  page: Page,
  input: AddMaterialTypeInput,
) => {
  await openAddMaterialTypePanel(page);
  await fillAddMaterialTypeForm(page, input);
  await confirmAddMaterialType(page);
};
