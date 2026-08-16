/**
 * E2E for attachment persistence across close + reopen, and for the save-time
 * reconcile.
 *
 * Two behaviours, and the second is the interesting one:
 *
 *  1. Upload → save → close → reopen: the row is back and its bytes still
 *     resolve. This is the fileStream equivalent of `modelSvgPersistence`.
 *  2. Upload → delete → save: the blob is gone from `ModelCoMap.documents`.
 *     Bytes are written on upload but the DOCUMENT node that names them only
 *     reaches Jazz on an explicit save, so the two can drift; `updateModelGraph`
 *     reconciles them (`pruneOrphanDocuments`). Without that, every uploaded-
 *     then-removed file would be retained forever.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { addDocumentTool } from '@system/modules/Composer/mcpTools/addDocument';
import { deleteDocumentTool } from '@system/modules/Composer/mcpTools/deleteDocument';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import { closeViewportTool } from '@kernel/modules/Layout/mcpTools/closeViewport';
import {
  openPointerPanel,
  confirmPointerPanel,
} from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  documentCount,
  openDocumentListAccordion,
  waitForDocumentRow,
} from '@system/modules/Composer/components/viewports/DocumentListAccordion/drivers/AddDocumentButton.click.puppeteer';

const SVG_FIXTURE = path.resolve(__dirname, '../../../fixtures/sample.svg');
const WORKSPACE = 'e2e-documentPersistence';
const MARKER = 'KLIPPEL_PERSIST_MARKER_4c7b';
const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

let tempDir = '';
let textFixture = '';

const setupModel = async (): Promise<{ id: string; name: string }> => {
  const id = `e2e-docp-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await page!.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
  await openModelTool.execute({ modelName: name });
  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector('[data-testid="svg-empty-state"]');
  await uploadVariationSVGTool.execute({ filePath: SVG_FIXTURE });
  await page!.waitForSelector('#svg-editor');
  return { id, name };
};

const saveModel = async (message: string) => {
  await openPointerPanel(page!, '#composer-save-model', 'save-model-form');
  await page!.type(
    '[data-testid="save-model-form"] [data-testid="save-model-message"] textarea:not([readonly])',
    message,
  );
  await confirmPointerPanel(page!);
};

const documentIdOf = (p: Page, label: string) =>
  p.$eval(
    `[data-testid="document-item"][data-document-label="${label}"]`,
    /* istanbul ignore next */
    (el) => el.getAttribute('data-document-id') ?? '',
  );

const readBack = (p: Page, id: string, documentId: string) =>
  p.evaluate(
    /* istanbul ignore next */
    async (args: { id: string; documentId: string }) => {
      const doc = await window.electron.jazz.loadModelDocument(
        args.id,
        args.documentId,
      );
      if (!doc) return null;
      return new TextDecoder().decode(new Uint8Array(doc.bytes));
    },
    { id, documentId },
  );

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');

  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klippel-e2e-docp-'));
  textFixture = path.join(tempDir, 'persistente.txt');
  fs.writeFileSync(textFixture, `${MARKER}\n`, 'utf-8');

  await resetWorkspace(page, WORKSPACE);
  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(WORKSPACE);
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('model document persistence (E2E)', () => {
  it('survives close + reopen with its bytes intact', async () => {
    const { id, name } = await setupModel();

    await addDocumentTool.execute({ sourceFilePath: textFixture });
    await waitForDocumentRow(page!, 'persistente.txt');
    const documentId = await documentIdOf(page!, 'persistente.txt');

    await saveModel('anexa documento');

    await closeViewportTool.execute();
    await page!.waitForSelector('#svg-editor', { hidden: true, timeout: 10_000 });

    await openModelTool.execute({ modelName: name });
    await switchViewTool.execute({ view: 'svg' });
    await page!.waitForSelector('#svg-editor');

    // The row is rebuilt from the persisted graph …
    await openDocumentListAccordion(page!);
    await waitForDocumentRow(page!, 'persistente.txt');
    expect(await documentCount(page!)).toBe(1);

    // … and the blob it points at still resolves.
    expect(await readBack(page!, id, documentId)).toContain(MARKER);
  }, 120_000);

  it('prunes the blob of a document deleted before the save', async () => {
    const { id } = await setupModel();

    await addDocumentTool.execute({ sourceFilePath: textFixture });
    await waitForDocumentRow(page!, 'persistente.txt');
    const documentId = await documentIdOf(page!, 'persistente.txt');
    // Present right after upload — bytes go to Jazz immediately.
    expect(await readBack(page!, id, documentId)).toContain(MARKER);

    await deleteDocumentTool.execute({ label: 'persistente.txt' });
    await saveModel('remove documento');

    // The save reconciled `documents` against the graph it wrote.
    expect(await readBack(page!, id, documentId)).toBeNull();
  }, 120_000);
});
