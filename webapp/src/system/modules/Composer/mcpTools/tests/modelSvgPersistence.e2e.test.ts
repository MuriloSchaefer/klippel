/**
 * E2E coverage for the SVG-persists-across-close+reopen flow described in
 * the Phase 2b change doc. Reproduces the user-reported bug:
 *
 *   1. Create a model
 *   2. Open it
 *   3. Switch to SVG view
 *   4. Upload an SVG
 *   5. Save with a commit message
 *   6. Close the viewport
 *   7. Open the model again
 *   8. Switch to SVG view
 *   9. The SVG should still render
 *
 * On a healthy Jazz path the BinaryCoStream attached to the ModelCoMap survives
 * the viewport tear-down and is re-streamed on `openModel`.
 *
 * Skips if CDP is unreachable.
 */
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { uploadVariationSVGTool } from '../uploadVariationSVG';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchViewTool } from '../switchView';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';
import { closeViewportTool } from '../../../../../kernel/modules/Layout/mcpTools/closeViewport';
import {
  openPointerPanel,
  confirmPointerPanel,
} from '../../../../../kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/sample.svg');
const TEST_WORKSPACE = 'e2e-modelSvgPersistence';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForCreateFormClosed = async (p: Page) => {
  await p.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
};

// The fixture sample.svg ships 3 circles, 2 paths, 1 rect — same selector
// strategy used in uploadVariationSVG.e2e.test.ts.
const waitForFixtureRendered = async (p: Page) => {
  await p.waitForFunction(() => {
    const editor = document.querySelector('#svg-editor');
    if (!editor) return false;
    return (
      editor.querySelectorAll('circle').length >= 3 &&
      editor.querySelectorAll('path').length >= 2 &&
      editor.querySelectorAll('rect').length >= 1
    );
  });
};

const openModelAndSwitchToSVG = async (modelName: string) => {
  await openModelTool.execute({ modelName });
  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector(
    '#composer-active-view[data-active-view="svg"]',
    { timeout: 10_000 },
  );
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, TEST_WORKSPACE);

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(TEST_WORKSPACE);
});

describe('SVG persists across viewport close + reopen', () => {
  it('renders the previously-uploaded SVG when the model is reopened', async () => {
    const id = `e2e-${uniqueSuffix()}`;
    const name = `Persistence ${id}`;

    // Step 1: create
    await createModelTool.execute({ name, id });
    await waitForCreateFormClosed(page!);

    // Step 2-3: open + switch to SVG view
    await openModelAndSwitchToSVG(name);
    await page!.waitForSelector('[data-testid="svg-empty-state"]', {
      timeout: 10_000,
    });

    // Step 4: upload SVG, confirm render
    await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
    await page!.waitForSelector('[data-testid="svg-empty-state"]', {
      hidden: true,
      timeout: 10_000,
    });
    await waitForFixtureRendered(page!);

    // Step 5: save with a commit message
    await openPointerPanel(page!, '#composer-save-model', 'save-model-form');
    await page!.type(
      '[data-testid="save-model-form"] [data-testid="save-model-message"] textarea:not([readonly])',
      'persist svg',
    );
    await confirmPointerPanel(page!);

    // Step 6: close the active viewport
    await closeViewportTool.execute();
    await page!.waitForSelector('#svg-editor', { hidden: true, timeout: 10_000 });

    // Step 7-8: reopen + switch back to SVG view
    await openModelAndSwitchToSVG(name);

    // Step 9: empty state must NOT appear; the persisted SVG must render again.
    await page!.waitForSelector('[data-testid="svg-empty-state"]', {
      hidden: true,
      timeout: 15_000,
    });
    await waitForFixtureRendered(page!);
  }, 90_000);
});
