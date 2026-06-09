/**
 * E2E tests for addLogo + addLogoShortcut.
 *
 * Each test:
 *   - creates a model and opens it
 *   - uploads the shared sample.svg fixture as the variation SVG
 *   - adds an SVG-source logo via the Logos accordion
 *   - asserts the logo actually renders in the editor SVG: the source <symbol>
 *     is injected into #svg-editor carrying the DECODED source geometry (the
 *     fixture's <path id="logo-mark">) and the main-copy overlay renders, and the
 *     row appears. The decoded geometry rendering transitively proves the owned
 *     DOCUMENT node exists and is linked (the symbol is derived by decoding the
 *     DOCUMENT's base64 resolved via LogoSource.documentId). A persisted-graph
 *     assertion is intentionally avoided: an open model's graph is not flushed to
 *     Jazz until saved, so loadModel would race the render.
 *
 * Raster sources are intentionally out of scope (the quantization IPC is not yet
 * implemented), so these tests cover SVG sources only.
 */
import * as path from 'path';
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

import { addLogoTool } from '@system/modules/Composer/mcpTools/addLogo';
import { addLogoShortcutTool } from '@system/modules/Composer/mcpTools/addLogoShortcut';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');
const LOGO_FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/logo-sample.svg');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForCreateModelFormClosed = async (p: Page) => {
  await p.waitForSelector('[role="pointer-panel-content"] #name', { hidden: true });
};

const setupModelWithSvg = async () => {
  const id = `e2e-logo-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await waitForCreateModelFormClosed(page!);
  await openModelTool.execute({ modelName: name });

  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector('[data-testid="svg-empty-state"]');
  await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
  await page!.waitForSelector('#svg-editor');
  return { id, name };
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-addLogo');

  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-addLogo');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('addLogo via click (E2E)', () => {
  it('adds an SVG logo: row, injected symbol, main-copy overlay, and linked DOCUMENT node', async () => {
    await setupModelWithSvg();
    await addLogoTool.execute({
      name: 'click-logo',
      method: 'embroidery',
      colors: 3,
      sourceFixturePath: LOGO_FIXTURE_PATH,
    });

    await page!.waitForSelector('[data-testid="logo-item"][data-logo-label="click-logo"]');
    // The logo actually renders in the editor SVG: the source <symbol> is
    // injected AND carries the DECODED source geometry (the fixture's
    // <path id="logo-mark">), proving the SVG was decoded and mounted — not just
    // that a node exists.
    await page!.waitForSelector('#svg-editor [id^="logo-sym-"]');
    await page!.waitForSelector('#svg-editor [id="logo-mark"]');
    // Main-copy overlay rendered (the document decoded and painted as an <img>).
    await page!.waitForSelector('[data-testid="logo-main-copy"] img');
  }, 90_000);

  it('rejects a non-SVG source path at the tool boundary', async () => {
    await expect(
      addLogoTool.execute({
        name: 'bad-source',
        method: 'embroidery',
        sourceFixturePath: '/tmp/not-an-svg.png',
      }),
    ).rejects.toThrow();
  });
});

describe('addLogo via shortcut (E2E)', () => {
  it('adds an SVG logo by keyboard and links its DOCUMENT node', async () => {
    await setupModelWithSvg();
    await addLogoShortcutTool.execute({
      name: 'shortcut-logo',
      method: 'silkscreen',
      colors: 2,
      sourceFixturePath: LOGO_FIXTURE_PATH,
    });

    await page!.waitForSelector('[data-testid="logo-item"][data-logo-label="shortcut-logo"]');
    // Logo renders in the editor SVG (decoded geometry mounted).
    await page!.waitForSelector('#svg-editor [id^="logo-sym-"]');
    await page!.waitForSelector('#svg-editor [id="logo-mark"]');
  }, 90_000);
});
