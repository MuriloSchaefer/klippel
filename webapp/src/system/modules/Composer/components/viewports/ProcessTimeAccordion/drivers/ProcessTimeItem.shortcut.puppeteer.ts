/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import {
  PROCESS_TIME_AUDIT_TESTID,
  PROCESS_TIME_ITEM_TESTID,
} from './ProcessTimeItem.click.puppeteer';

export const FOCUS_PROCESS_TIME_LIST_SHORTCUT = {
  ctrl: true,
  alt: true,
  key: 't',
} as const;
export const FOCUS_NEXT_PROCESS_TIME_SHORTCUT = 'ArrowDown' as const;
export const FOCUS_PREV_PROCESS_TIME_SHORTCUT = 'ArrowUp' as const;
export const OPEN_PROCESS_TIME_AUDIT_SHORTCUT = 'l' as const;

const ITEM_SEL = `[data-testid="${PROCESS_TIME_ITEM_TESTID}"]`;
const FOCUSED_ITEM_SEL = `${ITEM_SEL}:focus`;
const FOCUSED_ACCORDION_CONTENT_SEL = '[data-accordion-content="Tempo"]:focus';

const rowSelector = (label: string) =>
  `${ITEM_SEL}[data-process-label="${label}"]`;
const focusedRowSelector = (label: string) =>
  `${rowSelector(label)}:focus`;

const readFocusedRowLabel = async (page: Page): Promise<string | null> => {
  const handle = await page.$(FOCUSED_ITEM_SEL);
  if (!handle) return null;
  const label = await handle.evaluate((el) =>
    el.getAttribute('data-process-label'),
  );
  await handle.dispose();
  return label;
};

export const triggerFocusProcessTimeList = async (page: Page) => {
  const focused = await page.$(FOCUSED_ITEM_SEL);
  if (focused) {
    await focused.evaluate((el) => (el as HTMLElement).blur());
    await focused.dispose();
  }
  await page.keyboard.down('Control');
  await page.keyboard.press('g');
  await page.keyboard.up('Control');
  await page.waitForSelector(
    `${FOCUSED_ITEM_SEL}, ${FOCUSED_ACCORDION_CONTENT_SEL}`,
  );
};

// Capture the focused row, press the arrow, then wait for focus to land on a
// *different* row. The arrow shortcut is scoped to PROCESS_TIME_LIST_CONTEXT_ID
// and only fires while focus is inside the accordion subtree; if focus has
// drifted off, refocus the first row before pressing.
const triggerFocusMove = async (page: Page, key: string) => {
  let before = await readFocusedRowLabel(page);
  if (before === null) {
    await page.focus(ITEM_SEL);
    await page.waitForSelector(FOCUSED_ITEM_SEL);
    before = await readFocusedRowLabel(page);
  }
  await page.keyboard.press(key as Parameters<Page['keyboard']['press']>[0]);
  await page.waitForSelector(
    `${FOCUSED_ITEM_SEL}:not([data-process-label="${before}"])`,
  );
};

export const triggerFocusNextProcessTime = async (page: Page) => {
  await triggerFocusMove(page, FOCUS_NEXT_PROCESS_TIME_SHORTCUT);
};

export const triggerFocusPrevProcessTime = async (page: Page) => {
  await triggerFocusMove(page, FOCUS_PREV_PROCESS_TIME_SHORTCUT);
};

export const triggerOpenProcessTimeAuditFromFocused = async (
  page: Page,
  label: string,
) => {
  await page.keyboard.press(OPEN_PROCESS_TIME_AUDIT_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${PROCESS_TIME_AUDIT_TESTID}"][data-process-audit-label="${label}"]`,
  );
};

export const focusProcessTimeItem = async (page: Page, label: string) => {
  const sel = rowSelector(label);
  await page.waitForSelector(sel);
  await page.focus(sel);
  await page.waitForSelector(focusedRowSelector(label));
};

export type FocusedProcessTimeTarget =
  | { type: 'process-time-item'; label: string | null }
  | { type: 'accordion-content' }
  | { type: 'unknown'; tag: string }
  | null;

export const getFocusedProcessTimeTarget = async (
  page: Page,
): Promise<FocusedProcessTimeTarget> => {
  const itemHandle = await page.$(FOCUSED_ITEM_SEL);
  if (itemHandle) {
    const label = await itemHandle.evaluate((el) =>
      el.getAttribute('data-process-label'),
    );
    await itemHandle.dispose();
    return { type: 'process-time-item', label };
  }
  const contentHandle = await page.$(FOCUSED_ACCORDION_CONTENT_SEL);
  if (contentHandle) {
    await contentHandle.dispose();
    return { type: 'accordion-content' };
  }
  const anyFocus = await page.$(':focus');
  if (!anyFocus) return null;
  const tag = await anyFocus.evaluate((el) => el.tagName.toLowerCase());
  await anyFocus.dispose();
  return { type: 'unknown', tag };
};

export const getFocusedProcessTimeLabel = (
  page: Page,
): Promise<string | null> => readFocusedRowLabel(page);
