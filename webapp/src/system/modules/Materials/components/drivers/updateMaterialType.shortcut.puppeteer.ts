/* istanbul ignore file */
/**
 * Shortcut variant of the "Editar tipo de material" driver. Opens
 * via `r` while the Materiais ribbon tab is active — binding
 * `Materials/TiposDeMateriais/updateType`.
 */
import type { Page } from "puppeteer-core";
import {
  UPDATE_MATERIAL_TYPE_PANEL,
  type UpdateMaterialTypeInput,
  confirmUpdateMaterialType,
  fillUpdateMaterialTypeForm,
} from "./updateMaterialType.form.puppeteer";

export type { AttrInput, UpdateMaterialTypeInput } from "./updateMaterialType.form.puppeteer";
export {
  fillUpdateMaterialTypeForm,
  confirmUpdateMaterialType,
} from "./updateMaterialType.form.puppeteer";

export const openUpdateMaterialTypePanelShortcut = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.keyboard.press("r");
  await page.waitForSelector(
    `[role="pointer-panel-content"] ${UPDATE_MATERIAL_TYPE_PANEL}`,
  );
};

export const updateMaterialTypeViaShortcut = async (
  page: Page,
  input: UpdateMaterialTypeInput,
) => {
  await openUpdateMaterialTypePanelShortcut(page);
  await fillUpdateMaterialTypeForm(page, input);
  await confirmUpdateMaterialType(page);
};
