/* istanbul ignore file */
/**
 * Shortcut variant of the "Novo tipo de material" driver. Opens the
 * PointerContainer by pressing `e` while the Materiais ribbon tab is
 * the active context — the binding is registered in
 * `Materials/kernelCalls.ts → postBootInitialization` with
 * `contextId: "Materials/TiposDeMateriais"` and is visible via the
 * paired `ShortcutHint` on the IconButton.
 *
 * Form-fill + confirm are shared with the click variant via
 * `addMaterialType.form.puppeteer.ts`, so the keyboard / click paths
 * differ only in how the panel is opened.
 */
import type { Page } from "puppeteer-core";
import {
  ADD_MATERIAL_TYPE_PANEL,
  type AddMaterialTypeInput,
  confirmAddMaterialType,
  fillAddMaterialTypeForm,
} from "./addMaterialType.form.puppeteer";

export type { AddMaterialTypeInput, AttrInput } from "./addMaterialType.form.puppeteer";
export {
  fillAddMaterialTypeForm,
  confirmAddMaterialType,
} from "./addMaterialType.form.puppeteer";

export const openAddMaterialTypePanelShortcut = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  // The shortcut only fires while the Materiais ribbon tab is active.
  // The test sets up that precondition; the driver itself just
  // dispatches the key.
  await page.keyboard.press("e");
  await page.waitForSelector(
    `[role="pointer-panel-content"] ${ADD_MATERIAL_TYPE_PANEL}`,
  );
};

export const addMaterialTypeViaShortcut = async (
  page: Page,
  input: AddMaterialTypeInput,
) => {
  await openAddMaterialTypePanelShortcut(page);
  await fillAddMaterialTypeForm(page, input);
  await confirmAddMaterialType(page);
};
