/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const PROCESS_TIME_ITEM_TESTID = 'process-time-item';
export const PROCESS_TIME_AUDIT_LOG_TESTID = 'process-time-audit-log';
export const PROCESS_TIME_AUDIT_TESTID = 'process-time-audit';

export const rowSelector = (label: string) =>
  `[data-testid="${PROCESS_TIME_ITEM_TESTID}"][data-process-label="${label}"]`;

export const waitForProcessTimeItem = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label));
};

// The computation middleware writes `timeAudit`/`computedTimePerUnit` back to
// the node ~300ms (debounced) after the process is added. The row exposes its
// settled state via `data-process-time-status="computed|pending"`; wait on the
// computed variant so audit-panel drivers never click while the time is stale.
export const waitForProcessTimeComputed = async (page: Page, label: string) => {
  await page.waitForSelector(
    `${rowSelector(label)}[data-process-time-status="computed"]`,
  );
};

export const clickProcessTimeAuditLog = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${PROCESS_TIME_AUDIT_LOG_TESTID}"]`;
  await page.waitForSelector(sel);
  // See ProcessElectiveButton.click.puppeteer.ts — the audit-log control is a
  // PointerContainer > Tooltip > IconButton stack, and a real mouse click on
  // the inner SVG bubbles through Tooltip's instrumented handlers without
  // firing PointerContainer's onClick. A programmatic HTMLElement.click()
  // dispatches straight to React's onClick and opens the panel reliably.
  await page.$eval(sel, (el) => (el as HTMLButtonElement).click());
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${PROCESS_TIME_AUDIT_TESTID}"][data-process-audit-label="${label}"]`,
  );
};

export const readProcessTimeAuditText = async (
  page: Page,
  label: string,
): Promise<string> => {
  const sel = `[role="pointer-panel-content"] [data-testid="${PROCESS_TIME_AUDIT_TESTID}"][data-process-audit-label="${label}"]`;
  await page.waitForSelector(sel);
  return page.$eval(sel, (el) => (el as HTMLElement).innerText);
};
