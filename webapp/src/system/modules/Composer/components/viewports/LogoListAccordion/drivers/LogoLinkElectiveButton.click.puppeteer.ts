/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import { logoItemSelector } from './LogoItem.click.puppeteer';

export const LOGO_LINK_ELECTIVE_PANEL_TESTID = 'logo-link-elective';
export const LOGO_LINK_ELECTIVE_SELECT_TESTID = 'logo-link-elective-select';
export const LOGO_LINK_ELECTIVE_CONFIRM_TESTID = 'logo-link-elective-confirm';

const panel = (sub: string) =>
  `[role="pointer-panel-content"] [data-testid="${LOGO_LINK_ELECTIVE_PANEL_TESTID}"] ${sub}`;

export const openLogoLinkElective = async (page: Page, logoLabel: string) => {
  const trigger = `${logoItemSelector(logoLabel)} [data-testid="logo-item-link-elective"]`;
  await page.waitForSelector(trigger);
  await page.click(trigger);
  await page.waitForSelector(panel(''));
};

export const selectLogoElectiveOption = async (page: Page, electiveLabel: string) => {
  const selectSel = panel(`[data-testid="${LOGO_LINK_ELECTIVE_SELECT_TESTID}"]`);
  await page.waitForSelector(selectSel);
  await page.click(selectSel);
  const optionSel = `[role="listbox"] [data-testid="logo-link-elective-option-${electiveLabel}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

/** The confirm button lives in [role="pointer-panel-actions"], not the content
 * region — use the canonical pointer-panel confirm helper. */
export const confirmLogoLinkElective = (page: Page) => confirmPointerPanel(page);
