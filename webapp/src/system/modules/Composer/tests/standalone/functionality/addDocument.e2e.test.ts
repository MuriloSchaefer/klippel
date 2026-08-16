/**
 * E2E for model attachments: upload (click + shortcut), rename, preview, and
 * delete, through the Documentos accordion.
 *
 * Two things are asserted beyond "a row appeared", because they are the whole
 * point of the storage design:
 *
 *  1. The bytes come back. `loadModelDocument` resolves the same content that
 *     was uploaded — proof the fileStream round-trip works, not just that a
 *     graph node exists.
 *  2. The bytes are **not** in the graph. `graphJson` must not contain the
 *     file's content, since attachments exist precisely so that the model's
 *     atomic graph string does not carry them
 *     (`Store/schema.ts`, `DocumentCoMap`).
 *
 * Skips nothing: fails loudly if the dev app is unreachable.
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

jest.mock('../../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { addDocumentTool } from '@system/modules/Composer/mcpTools/addDocument';
import { addDocumentShortcutTool } from '@system/modules/Composer/mcpTools/addDocumentShortcut';
import { renameDocumentTool } from '@system/modules/Composer/mcpTools/renameDocument';
import { deleteDocumentTool } from '@system/modules/Composer/mcpTools/deleteDocument';
import { deleteDocumentShortcutTool } from '@system/modules/Composer/mcpTools/deleteDocumentShortcut';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import {
  openPointerPanel,
  confirmPointerPanel,
} from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  documentCount,
  openDocumentListAccordion,
  previewDocumentViaClick,
  waitForDocumentRow,
} from '@system/modules/Composer/components/viewports/DocumentListAccordion/drivers/AddDocumentButton.click.puppeteer';

const SVG_FIXTURE = path.resolve(__dirname, '../../fixtures/sample.svg');
const WORKSPACE = 'e2e-documents';
const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

/** Distinctive bytes, so "is this in graphJson?" is an unambiguous question. */
const TEXT_MARKER = 'KLIPPEL_ATTACHMENT_MARKER_9f3a';

let tempDir = '';
let textFixture = '';
let modelId = '';

const setupModel = async () => {
  modelId = `e2e-doc-${uniqueSuffix()}`;
  const name = `E2E ${modelId}`;
  await createModelTool.execute({ name, id: modelId });
  await page!.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
  await openModelTool.execute({ modelName: name });
  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector('[data-testid="svg-empty-state"]');
  await uploadVariationSVGTool.execute({ filePath: SVG_FIXTURE });
  await page!.waitForSelector('#svg-editor');
  return name;
};

/** Read an attachment back through the same IPC the UI uses. */
const readBackText = (p: Page, id: string, documentId: string) =>
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

/**
 * `graphJson` is written only by an explicit save (`CLAUDE.md`: a session is a
 * moment the user chose), so any assertion about what the graph does or does
 * not carry has to save first — otherwise it reads the state from before the
 * upload and passes for the wrong reason.
 */
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

const graphJsonOf = (p: Page, id: string) =>
  p.evaluate(
    /* istanbul ignore next */
    async (mid: string) => {
      const model = await window.electron.jazz.loadModel(mid);
      return model?.graphJson ?? '';
    },
    id,
  );

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');

  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klippel-e2e-doc-'));
  textFixture = path.join(tempDir, 'anexo.txt');
  fs.writeFileSync(textFixture, `${TEXT_MARKER}\nconteúdo de teste\n`, 'utf-8');

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

describe('addDocument via click (E2E)', () => {
  it('attaches a file, stores the bytes outside graphJson, and reads them back', async () => {
    await setupModel();

    await addDocumentTool.execute({ sourceFilePath: textFixture });
    await waitForDocumentRow(page!, 'anexo.txt');
    expect(await documentCount(page!)).toBe(1);

    const documentId = await documentIdOf(page!, 'anexo.txt');
    expect(documentId).not.toBe('');

    // 1. The bytes round-trip through the fileStream.
    const content = await readBackText(page!, modelId, documentId);
    expect(content).toContain(TEXT_MARKER);

    // 2. And they are nowhere near the model's graph string. Save first, so
    //    the graph under test is one that actually contains the attachment —
    //    asserting against an unsaved graph would pass trivially.
    await saveModel('anexa documento');
    const graphJson = await graphJsonOf(page!, modelId);
    // The metadata node is there — that is how the row survives a reload …
    expect(graphJson).toContain(documentId);
    // … and the bytes are not. This is the invariant the storage design exists
    // to hold (see `DocumentCoMap` in Store/schema.ts).
    expect(graphJson).not.toContain(TEXT_MARKER);
  }, 90_000);

  it('renames a document without touching its stored filename', async () => {
    await setupModel();
    await addDocumentTool.execute({ sourceFilePath: textFixture });
    await waitForDocumentRow(page!, 'anexo.txt');

    await renameDocumentTool.execute({
      label: 'anexo.txt',
      newLabel: 'Ficha técnica',
    });
    await waitForDocumentRow(page!, 'Ficha técnica');

    const documentId = await documentIdOf(page!, 'Ficha técnica');
    const doc = await page!.evaluate(
      /* istanbul ignore next */
      async (args: { id: string; documentId: string }) => {
        const d = await window.electron.jazz.loadModelDocument(
          args.id,
          args.documentId,
        );
        return d ? { filename: d.filename, mime: d.mime } : null;
      },
      { id: modelId, documentId },
    );
    expect(doc?.filename).toBe('anexo.txt');
  }, 90_000);

  it('previews a type it cannot render as an explicit "no preview"', async () => {
    await setupModel();
    await addDocumentTool.execute({ sourceFilePath: textFixture });
    await waitForDocumentRow(page!, 'anexo.txt');

    await previewDocumentViaClick(page!, 'anexo.txt');
    // text/plain is deliberately not previewable — guessing a renderer for an
    // arbitrary binary is how you end up executing it.
    await page!.waitForSelector('[data-testid="document-preview-unavailable"]');
  }, 90_000);

  it('deletes a document and drops its blob', async () => {
    await setupModel();
    await addDocumentTool.execute({ sourceFilePath: textFixture });
    await waitForDocumentRow(page!, 'anexo.txt');
    const documentId = await documentIdOf(page!, 'anexo.txt');

    await deleteDocumentTool.execute({ label: 'anexo.txt' });
    await openDocumentListAccordion(page!);
    expect(await documentCount(page!)).toBe(0);

    const afterDelete = await readBackText(page!, modelId, documentId);
    expect(afterDelete).toBeNull();
  }, 90_000);
});

describe('addDocument via shortcut (E2E)', () => {
  it('attaches by keyboard and deletes the focused row with "d"', async () => {
    await setupModel();

    await addDocumentShortcutTool.execute({ sourceFilePath: textFixture });
    await waitForDocumentRow(page!, 'anexo.txt');
    expect(await documentCount(page!)).toBe(1);

    await deleteDocumentShortcutTool.execute({ label: 'anexo.txt' });
    await openDocumentListAccordion(page!);
    expect(await documentCount(page!)).toBe(0);
  }, 90_000);
});
