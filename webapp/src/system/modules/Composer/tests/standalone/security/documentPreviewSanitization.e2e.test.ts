/**
 * Security E2E — an SVG **attachment** is untrusted markup.
 *
 * Unlike the model's own drawing, an attachment can be any file a user was
 * handed: a supplier's SVG, something pulled off a website. If the preview
 * mounted it as live markup, a `<script>` or an `onload=` handler inside it
 * would execute with the renderer's privileges, which in this app means access
 * to the whole `window.electron` IPC surface.
 *
 * Two defences, and this asserts both:
 *
 *  1. The markup goes through `sanitizeSvg` before it is shown.
 *  2. It is rendered from a `blob:` URL in an `<img>`, which does not execute
 *     script even if something survived step 1.
 *
 * The probe sets `window.__docXss__`; nothing may ever set it.
 *
 * Sibling of `svgSanitization.e2e.test.ts`, which covers the same threat for
 * the drawing-upload path.
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
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import {
  previewDocumentViaClick,
  waitForDocumentRow,
} from '@system/modules/Composer/components/viewports/DocumentListAccordion/drivers/AddDocumentButton.click.puppeteer';

const SVG_FIXTURE = path.resolve(__dirname, '../../fixtures/sample.svg');
const WORKSPACE = 'e2e-documentSanitization';
const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

/** Every vector the sanitizer is supposed to strip, in one file. */
const HOSTILE_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"
     onload="window.__docXss__ = 'onload'">
  <script>window.__docXss__ = 'script';</script>
  <rect width="100" height="100" fill="#cc0000"
        onclick="window.__docXss__ = 'onclick'" />
  <a xlink:href="javascript:window.__docXss__='href'"><text y="20">x</text></a>
  <image href="http://127.0.0.1:1/pixel.png" />
</svg>
`;

let tempDir = '';
let hostileFixture = '';

const setupModel = async () => {
  const id = `e2e-docsec-${uniqueSuffix()}`;
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
};

const xssFlag = (p: Page) =>
  p.evaluate(
    /* istanbul ignore next */
    () => (window as unknown as { __docXss__?: string }).__docXss__ ?? null,
  );

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');

  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klippel-e2e-docsec-'));
  hostileFixture = path.join(tempDir, 'hostil.svg');
  fs.writeFileSync(hostileFixture, HOSTILE_SVG, 'utf-8');

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

describe('document preview sanitization (E2E)', () => {
  it('previews a hostile SVG attachment without executing any of it', async () => {
    await setupModel();
    await page!.evaluate(
      /* istanbul ignore next */
      () => {
        delete (window as unknown as { __docXss__?: string }).__docXss__;
      },
    );

    await addDocumentTool.execute({ sourceFilePath: hostileFixture });
    await waitForDocumentRow(page!, 'hostil.svg');

    await previewDocumentViaClick(page!, 'hostil.svg');
    // It *is* previewed — sanitization is not refusal.
    await page!.waitForSelector('[data-testid="document-preview"][data-preview-kind="svg"]');

    expect(await xssFlag(page!)).toBeNull();

    // The preview is an <img> off a blob: URL, not inline markup — so even a
    // sanitizer miss cannot reach the renderer's scope.
    const tag = await page!.$eval(
      '[data-testid="document-preview"] > *',
      /* istanbul ignore next */
      (el) => el.tagName.toLowerCase(),
    );
    expect(tag).toBe('img');

    // And no fragment of the hostile document was mounted into the page.
    const scriptCount = await page!.$$eval(
      '[data-testid="document-preview"] script',
      /* istanbul ignore next */
      (els) => els.length,
    );
    expect(scriptCount).toBe(0);
  }, 90_000);
});
