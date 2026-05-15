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

const rowSelector = (label: string) =>
  `[data-testid="${PROCESS_TIME_ITEM_TESTID}"][data-process-label="${label}"]`;

export const triggerFocusProcessTimeList = async (page: Page) => {
  await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (a?.matches('[data-testid="process-time-item"]')) a.blur();
  });
  await page.keyboard.down('Control');
  await page.keyboard.press('g');
  await page.keyboard.up('Control');
  await page.waitForFunction(
    () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return false;
      if (active.matches('[data-testid="process-time-item"]')) return true;
      return active.matches('[data-accordion-content="Tempo"]');
    },
    { timeout: 3_000 },
  );
};

const readFocusedRowLabel = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a?.matches('[data-testid="process-time-item"]')) return null;
    return a.getAttribute('data-process-label');
  });

// The ArrowDown/ArrowUp handler moves DOM focus synchronously on keydown, but
// `keyboard.press` resolving does not guarantee the renderer has applied it
// before the next read. Capture the focused row, press, then wait until focus
// actually lands on a *different* row so callers never read a stale label.
const triggerFocusMove = async (page: Page, key: string) => {
  const before = await readFocusedRowLabel(page);
  await page.keyboard.press(key as Parameters<Page['keyboard']['press']>[0]);
  await page.waitForFunction(
    (prev: string | null) => {
      const a = document.activeElement as HTMLElement | null;
      if (!a?.matches('[data-testid="process-time-item"]')) return false;
      return a.getAttribute('data-process-label') !== prev;
    },
    { timeout: 3_000 },
    before,
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
  await page.waitForFunction(
    (s: string) => document.activeElement?.matches(s) ?? false,
    {},
    sel,
  );
};

export type FocusedProcessTimeTarget =
  | { type: 'process-time-item'; label: string | null }
  | { type: 'accordion-content' }
  | { type: 'unknown'; tag: string }
  | null;

export const getFocusedProcessTimeTarget = async (
  page: Page,
): Promise<FocusedProcessTimeTarget> => {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return null;
    if (a.matches('[data-testid="process-time-item"]')) {
      return {
        type: 'process-time-item' as const,
        label: a.getAttribute('data-process-label'),
      };
    }
    if (a.matches('[data-accordion-content="Tempo"]')) {
      return { type: 'accordion-content' as const };
    }
    return { type: 'unknown' as const, tag: a.tagName.toLowerCase() };
  });
};

export const getFocusedProcessTimeLabel = async (
  page: Page,
): Promise<string | null> => {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a?.matches('[data-testid="process-time-item"]')) return null;
    return a.getAttribute('data-process-label');
  });
};
