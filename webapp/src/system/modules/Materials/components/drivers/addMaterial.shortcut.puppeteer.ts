/* istanbul ignore file */
/**
 * Shortcut variant of the "Novo material" driver. Opens the
 * PointerContainer via `q` while the Materiais ribbon tab is active
 * — binding registered in `Materials/kernelCalls.ts`
 * (`Materials/Estoque/addMaterial`).
 */
import type { Page } from "puppeteer-core";
import {
  ADD_MATERIAL_PANEL,
  type AddMaterialInput,
  confirmAddMaterial,
  fillAddMaterialForm,
} from "./addMaterial.form.puppeteer";

export type { AddMaterialInput } from "./addMaterial.form.puppeteer";
export {
  fillAddMaterialForm,
  confirmAddMaterial,
} from "./addMaterial.form.puppeteer";

export const openAddMaterialPanelShortcut = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.keyboard.press("q");
  await page.waitForSelector(
    `[role="pointer-panel-content"] ${ADD_MATERIAL_PANEL}`,
  );
};

export const addMaterialViaShortcut = async (
  page: Page,
  input: AddMaterialInput,
) => {
  await openAddMaterialPanelShortcut(page);
  await fillAddMaterialForm(page, input);
  await confirmAddMaterial(page);
};
