/* istanbul ignore file */
/**
 * Click variant of the "Editar tipo de material" driver. Form-fill +
 * confirm live in `updateMaterialType.form.puppeteer.ts`.
 */
import type { Page } from "puppeteer-core";
import {
  UPDATE_MATERIAL_TYPE_PANEL,
  UPDATE_MATERIAL_TYPE_TRIGGER,
  type UpdateMaterialTypeInput,
  confirmUpdateMaterialType,
  fillUpdateMaterialTypeForm,
} from "./updateMaterialType.form.puppeteer";

export type { AttrInput, UpdateMaterialTypeInput } from "./updateMaterialType.form.puppeteer";
export {
  fillUpdateMaterialTypeForm,
  confirmUpdateMaterialType,
} from "./updateMaterialType.form.puppeteer";

export const openUpdateMaterialTypePanel = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(UPDATE_MATERIAL_TYPE_TRIGGER);
  await page.click(UPDATE_MATERIAL_TYPE_TRIGGER);
  await page.waitForSelector(
    `[role="pointer-panel-content"] ${UPDATE_MATERIAL_TYPE_PANEL}`,
  );
};

export const updateMaterialType = async (
  page: Page,
  input: UpdateMaterialTypeInput,
) => {
  await openUpdateMaterialTypePanel(page);
  await fillUpdateMaterialTypeForm(page, input);
  await confirmUpdateMaterialType(page);
};
