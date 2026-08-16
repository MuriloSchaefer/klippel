/* istanbul ignore file */
import type { ElementHandle, Page } from 'puppeteer-core';
import {
  ADD_DOCUMENT_FILE_INPUT_TESTID,
  DOCUMENT_ITEM_TESTID,
  documentCount,
  openDocumentListAccordion,
  waitForDocumentCount,
  waitForDocumentRow,
  waitForDocumentRowRemoved,
} from './AddDocumentButton.click.puppeteer';

export const FOCUS_DOCUMENT_LIST_SHORTCUT = 'Control+d' as const;
export const ADD_DOCUMENT_SHORTCUT = 'a' as const;
export const RENAME_DOCUMENT_SHORTCUT = 'e' as const;
export const PREVIEW_DOCUMENT_SHORTCUT = 'p' as const;
export const DELETE_DOCUMENT_SHORTCUT = 'd' as const;

/**
 * `Ctrl+d` from the model viewport: expands the accordion and pulls focus to
 * the first row (or the add button when the list is empty).
 */
export const focusDocumentListViaShortcut = async (page: Page) => {
  await page.keyboard.down('Control');
  await page.keyboard.press('d');
  await page.keyboard.up('Control');
  await page.waitForSelector('[data-testid="document-list"]');
};

/**
 * Focus a row by label so the single-key row actions have a target — they all
 * resolve `document.activeElement.closest('[data-testid="document-item"]')`.
 */
export const focusDocumentRow = async (page: Page, label: string) => {
  await waitForDocumentRow(page, label);
  const handle = await page.$(
    `[data-testid="${DOCUMENT_ITEM_TESTID}"][data-document-label="${label}"]`,
  );
  if (!handle) throw new Error(`no document row labelled "${label}"`);
  await handle.focus();
};

/**
 * The keyboard path to an upload. `a` only forwards a click to the hidden file
 * input — there is no OS picker to drive — so the file itself still arrives via
 * `uploadFile`, exactly as the click driver does. What this asserts is that the
 * *binding* reaches the input.
 */
export const uploadDocumentViaShortcut = async (page: Page, filePath: string) => {
  await openDocumentListAccordion(page);
  const before = await documentCount(page);
  await focusDocumentListViaShortcut(page);
  await page.keyboard.press(ADD_DOCUMENT_SHORTCUT);
  const input = (await page.$(
    `[data-testid="${ADD_DOCUMENT_FILE_INPUT_TESTID}"]`,
  )) as ElementHandle<HTMLInputElement> | null;
  if (!input) throw new Error('add-document file input not found');
  await input.uploadFile(filePath);
  await waitForDocumentCount(page, before + 1);
};

export const deleteDocumentViaShortcut = async (page: Page, label: string) => {
  await openDocumentListAccordion(page);
  await focusDocumentRow(page, label);
  await page.keyboard.press(DELETE_DOCUMENT_SHORTCUT);
  await waitForDocumentRowRemoved(page, label);
};

export const renameDocumentViaShortcut = async (
  page: Page,
  label: string,
  nextLabel: string,
) => {
  await openDocumentListAccordion(page);
  await focusDocumentRow(page, label);
  await page.keyboard.press(RENAME_DOCUMENT_SHORTCUT);
  const inputSel = '[data-testid="document-rename-input"]';
  await page.waitForSelector(inputSel);
  await page.click(inputSel, { count: 3 });
  await page.keyboard.press('Backspace');
  await page.keyboard.type(nextLabel);
  await page.keyboard.press('Enter');
  await waitForDocumentRow(page, nextLabel);
};

export const previewDocumentViaShortcut = async (page: Page, label: string) => {
  await openDocumentListAccordion(page);
  await focusDocumentRow(page, label);
  await page.keyboard.press(PREVIEW_DOCUMENT_SHORTCUT);
  await page.waitForSelector(
    '[data-testid="document-preview"], [data-testid="document-preview-unavailable"]',
  );
};
