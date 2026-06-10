/* istanbul ignore file */
import type { ElementHandle, Page } from 'puppeteer-core';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';

export const LOGO_ACCORDION_NAME = 'Logos';
export const ADD_LOGO_TRIGGER_TESTID = 'add-logo';
export const ADD_LOGO_FORM_TESTID = 'add-logo-form';
export const ADD_LOGO_NAME_TESTID = 'add-logo-name';
export const ADD_LOGO_METHOD_TESTID = 'add-logo-method';
export const ADD_LOGO_COLORS_TESTID = 'add-logo-colors';
export const ADD_LOGO_WIDTH_TESTID = 'add-logo-width';
export const ADD_LOGO_HEIGHT_TESTID = 'add-logo-height';
export const ADD_LOGO_FILE_INPUT_TESTID = 'add-logo-file-input';
export const ADD_LOGO_CONFIRM_TESTID = 'add-logo-confirm';

const panelInput = (testid: string) =>
  `[role="pointer-panel-content"] [data-testid="${testid}"] input, [role="pointer-panel-content"] [data-testid="${testid}"] textarea`;

/** Open the SettingsPanel and expand the "Logos" accordion so its list is in the DOM. */
export const openLogoListAccordion = async (page: Page) => {
  await ensureSettingsPanelExpanded(page);
  await expandAccordion(page, LOGO_ACCORDION_NAME);
  await page.waitForSelector('[data-testid="logo-list"]');
};

/** Open the "Adicionar Logo" pointer panel. Mirrors the visualization retry loop:
 * a still-mounted Modal portal from a prior panel can intercept the hit-test. */
export const openAddLogoPanel = async (page: Page) => {
  const triggerSel = `[data-testid="${ADD_LOGO_TRIGGER_TESTID}"]`;
  const formSel = `[role="pointer-panel-content"] [data-testid="${ADD_LOGO_FORM_TESTID}"]`;

  await resetUIState(page);
  await page.waitForSelector(triggerSel);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await resetUIState(page);
    const clicked = await page.evaluate((sel: string) => {
      const btn = document.querySelector(sel) as HTMLButtonElement | null;
      if (!btn) return false;
      btn.click();
      return true;
    }, triggerSel);
    if (!clicked) {
      await page.waitForSelector(triggerSel);
      continue;
    }
    try {
      // Bounded feature-detection: did the panel open? (documented exception)
      await page.waitForSelector(formSel, { timeout: 4_000 });
      return;
    } catch {
      // fall through and retry
    }
  }
  await page.click(triggerSel);
  await page.waitForSelector(formSel);
};

const clearAndType = async (page: Page, selector: string, value: string) => {
  await page.waitForSelector(selector);
  await page.click(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.type(selector, value);
};

export const typeAddLogoName = (page: Page, name: string) =>
  clearAndType(page, panelInput(ADD_LOGO_NAME_TESTID), name);

export const setAddLogoColors = (page: Page, colors: number) =>
  clearAndType(page, panelInput(ADD_LOGO_COLORS_TESTID), String(colors));

export const setAddLogoMethod = async (page: Page, method: string) => {
  const selectSel = `[role="pointer-panel-content"] [data-testid="${ADD_LOGO_METHOD_TESTID}"]`;
  await page.waitForSelector(selectSel);
  await page.click(selectSel);
  const optionSel = `[role="listbox"] [data-testid="add-logo-method-option-${method}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

/** Set one of the default-size amount fields (cm). */
export const setAddLogoSize = async (
  page: Page,
  dimension: 'width' | 'height',
  amount: number,
) => {
  const testid =
    dimension === 'width' ? ADD_LOGO_WIDTH_TESTID : ADD_LOGO_HEIGHT_TESTID;
  const sel = `[role="pointer-panel-content"] [data-testid="${testid}"] input#amount`;
  await clearAndType(page, sel, String(amount));
};

/** Upload a logo source file via the hidden <input type=file> and wait until the
 * file has been read/sanitized — signalled by the crop tool rendering, which the
 * form only mounts once fileKind + fileData are set (i.e. confirm is enabled). */
export const uploadAddLogoFile = async (page: Page, filePath: string) => {
  const inputSel = `[role="pointer-panel-content"] [data-testid="${ADD_LOGO_FILE_INPUT_TESTID}"]`;
  await page.waitForSelector(inputSel);
  const input = (await page.$(inputSel)) as ElementHandle<HTMLInputElement> | null;
  if (!input) throw new Error('add-logo file input not found');
  await input.uploadFile(filePath);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-cut-tool"]');
};

/** Confirm via the pointer-panel actions region (the confirm button lives in
 * [role="pointer-panel-actions"], not the content region). */
export const confirmAddLogo = (page: Page) => confirmPointerPanel(page);
