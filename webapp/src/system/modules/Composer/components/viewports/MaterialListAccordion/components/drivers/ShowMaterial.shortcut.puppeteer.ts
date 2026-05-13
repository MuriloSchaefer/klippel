/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { MATERIAL_COST_AUDIT_TESTID } from './ShowMaterial.click.puppeteer';

export const OPEN_AUDIT_LOG_SHORTCUT = 'l' as const;

export const triggerOpenAuditLogFromFocused = async (page: Page, label: string) => {
  await page.keyboard.press(OPEN_AUDIT_LOG_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${MATERIAL_COST_AUDIT_TESTID}"][data-material-audit-label="${label}"]`,
  );
};
