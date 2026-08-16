/* istanbul ignore file */
import type { ElementHandle, Page } from 'puppeteer-core';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';

export const DOCUMENT_ACCORDION_NAME = 'Documentos';
export const DOCUMENT_LIST_TESTID = 'document-list';
export const ADD_DOCUMENT_TRIGGER_TESTID = 'add-document';
export const ADD_DOCUMENT_FILE_INPUT_TESTID = 'add-document-file-input';
export const DOCUMENT_ITEM_TESTID = 'document-item';

const listSel = `[data-testid="${DOCUMENT_LIST_TESTID}"]`;

/** Open the SettingsPanel and expand "Documentos" so the list is in the DOM. */
export const openDocumentListAccordion = async (page: Page) => {
  await ensureSettingsPanelExpanded(page);
  await expandAccordion(page, DOCUMENT_ACCORDION_NAME);
  await page.waitForSelector(listSel);
};

/** How many attachment rows the list currently shows, read off the count mirror. */
export const documentCount = async (page: Page): Promise<number> => {
  const value = await page.$eval(
    listSel,
    /* istanbul ignore next */
    (el) => el.getAttribute('data-document-count') ?? '0',
  );
  return Number(value);
};

/** Wait until the list holds exactly `n` rows — a selector wait, not a poll. */
export const waitForDocumentCount = async (page: Page, n: number) => {
  await page.waitForSelector(`${listSel}[data-document-count="${n}"]`);
};

/**
 * Upload `filePath` through the real file input.
 *
 * The button only forwards a click to a hidden `<input type=file>`, and
 * `uploadFile` on that input is how puppeteer drives a native picker — so this
 * exercises the production path without the OS dialog. Resolves once the row
 * count has grown, which is the signal the upload IPC round-trip finished.
 */
export const uploadDocument = async (page: Page, filePath: string) => {
  await openDocumentListAccordion(page);
  const before = await documentCount(page);
  const input = (await page.$(
    `[data-testid="${ADD_DOCUMENT_FILE_INPUT_TESTID}"]`,
  )) as ElementHandle<HTMLInputElement> | null;
  if (!input) throw new Error('add-document file input not found');
  await input.uploadFile(filePath);
  await waitForDocumentCount(page, before + 1);
};

const rowSelector = (label: string) =>
  `[data-testid="${DOCUMENT_ITEM_TESTID}"][data-document-label="${label}"]`;

export const waitForDocumentRow = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label));
};

export const waitForDocumentRowRemoved = async (page: Page, label: string) => {
  await page.waitForSelector(rowSelector(label), { hidden: true });
};

/** The `documentId` of the row carrying `label` — the id every row action's testid embeds. */
export const documentIdForLabel = async (
  page: Page,
  label: string,
): Promise<string> => {
  const id = await page.$eval(
    rowSelector(label),
    /* istanbul ignore next */
    (el) => el.getAttribute('data-document-id') ?? '',
  );
  if (!id) throw new Error(`no document row labelled "${label}"`);
  return id;
};

const clickRowAction = async (page: Page, label: string, action: string) => {
  const documentId = await documentIdForLabel(page, label);
  const sel = `[data-testid="document-row-${action}-${documentId}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
};

export const deleteDocumentViaClick = async (page: Page, label: string) => {
  await openDocumentListAccordion(page);
  await clickRowAction(page, label, 'delete');
  await waitForDocumentRowRemoved(page, label);
};

export const previewDocumentViaClick = async (page: Page, label: string) => {
  await openDocumentListAccordion(page);
  await clickRowAction(page, label, 'preview');
  await page.waitForSelector('[data-testid="document-preview"], [data-testid="document-preview-unavailable"]');
};

/** Rename in place: click the pencil, replace the field's contents, commit with Enter. */
export const renameDocumentViaClick = async (
  page: Page,
  label: string,
  nextLabel: string,
) => {
  await openDocumentListAccordion(page);
  await clickRowAction(page, label, 'rename');
  const inputSel = '[data-testid="document-rename-input"]';
  await page.waitForSelector(inputSel);
  await page.click(inputSel, { count: 3 });
  await page.keyboard.press('Backspace');
  await page.type(inputSel, nextLabel);
  await page.keyboard.press('Enter');
  await waitForDocumentRow(page, nextLabel);
};
